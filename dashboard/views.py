from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.models import User
from rest_framework import permissions, status, views
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserRegistrationSerializer, UserSerializer
from django.contrib.auth import authenticate, login
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib import messages
from django.urls import reverse
from django.http import HttpResponseForbidden
from django.contrib.auth.decorators import login_required
from .models import UploadedFile
from .forms import FileUploadForm
from django.contrib.auth import logout
from django.http import JsonResponse
import os
from django.core.files.storage import default_storage
from django.views.decorators.csrf import csrf_exempt
#from openai import OpenAI
import openai
import json
from django.conf import settings
from storages.backends.gcloud import GoogleCloudStorage
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from google.cloud import storage
import datetime
from django.middleware.csrf import get_token
from django.urls import reverse
from django.http import HttpResponseRedirect
import logging
logger = logging.getLogger(__name__)



# ============================================================
# INDEX VIEW
def index(request):
    """Landing page with Login and Register buttons."""
    return render(request, 'dashboard/index.html') 



# USER REGISTRATION VIEW
def register_view(request):
    """Registers a new user and redirects to login."""
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password1')
        
        # Ensure username and email are unique
        if User.objects.filter(username=username).exists():
            return render(request, 'dashboard/register.html', {'error': 'Username already taken'})
        if User.objects.filter(email=email).exists():
            return render(request, 'dashboard/register.html', {'error': 'Email already in use'})

        # DEBUG: Check if User object is created
        try:
            user = User.objects.create_user(username=username, email=email, password=password)
            user.save()
            print(f"User {username} registered successfully!")  # Debugging
            return redirect('login')  # Redirect to login page after registration
        except Exception as e:
            print(f"Registration failed: {e}")  # Print any exception that occurs
            return render(request, 'dashboard/register.html', {'error': 'Registration failed. Try again.'})

    return render(request, 'dashboard/register.html')




# JWT TOKEN GENERATION VIEW
class ObtainTokenPairView(views.APIView):
    """Authenticate user and generate JWT tokens."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user is not None:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        return Response(status=status.HTTP_401_UNAUTHORIZED)



# LOGIN VIEW
def login_view(request):
    """Logs in the user and redirects to their specific dashboard."""
    if request.user.is_authenticated:
        return redirect('user_dashboard', username=request.user.username)  # Redirect already logged-in users

    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(username=username, password=password)

        if user is not None:
            login(request, user)
            return redirect('user_dashboard', username=user.username)  # Redirects correctly to their own dashboard
        else:
            return render(request, 'dashboard/login.html', {'error': 'Invalid username or password'})

    return render(request, 'dashboard/login.html')


# LOGOUT VIEW
def logout_view(request):
    """Logs out the user and redirects to login."""
    logout(request)
    return redirect('login')



# USER-SPECIFIC DASHBOARD VIEW
@ensure_csrf_cookie
@login_required
def user_dashboard(request, username):
    """User-specific dashboard."""
    if request.user.username != username:
        return redirect('login')  # Prevents unauthorized access

    # For initial GET requests and refresh
    user_files = UploadedFile.objects.filter(user=request.user)
    form = FileUploadForm()

    # Handle form submission
    if request.method == "POST":
        form = FileUploadForm(request.POST, request.FILES)
        if form.is_valid():
            try:
                uploaded_file = form.save(commit=False)
                uploaded_file.user = request.user
                uploaded_file.save()
                print(f"File uploaded to: {uploaded_file.file.url}")
                
                # Redirect to the same page (as a GET request)
                return HttpResponseRedirect(request.path)
            except Exception as e:
                print(f"Error uploading file: {str(e)}")
    
    # Render page (for both initial GET and after redirect)
    response = render(request, 'dashboard/dashboard.html', {"files": user_files, "form": form})
    response.set_cookie("csrftoken", get_token(request))
    return response


# SERVE FILE VIEW (Restricted to File Owner)
def serve_file(request, file_id):
    """Allow only the file owner to access their file."""
    try:
        # First check if user is authenticated via session
        if request.user.is_authenticated:
            user = request.user
        else:
            # Fall back to JWT if session auth is not available
            auth = JWTAuthentication()
            auth_user = auth.authenticate(request)
            if not auth_user:
                return redirect('login')
            user, _ = auth_user

        file = get_object_or_404(UploadedFile, id=file_id)
        
        # Check permissions
        if file.user != user:
            return HttpResponseForbidden("You do not have permission to access this file.")
        
        # Create a public URL that works without signing
        bucket_name = settings.GS_BUCKET_NAME
        file_path = file.file.name
        
        # Create the public URL
        public_url = f"https://storage.googleapis.com/{bucket_name}/{file_path}"
        
        # Redirect to the public URL
        return redirect(public_url)
        
    except AuthenticationFailed:
        return redirect('login')
    except UploadedFile.DoesNotExist:
        return HttpResponseForbidden("File not found.")




# DELETE FILE VIEW
@login_required
def delete_file_view(request, file_id):
    """Delete a file uploaded by the user."""
    try:
        # Authenticate user
        auth = JWTAuthentication()
        user_data = auth.authenticate(request)
        
        if user_data is None:
            # Fallback to session authentication since we're already using @login_required
            user = request.user
        else:
            user, _ = user_data  
        
        # Retrieve the file or return 404 if it doesn't exist
        file = get_object_or_404(UploadedFile, id=file_id, user=user)

        # Delete file from GCS
        file.file.delete()  # Deletes from GCS
        file.delete()       # Removes from database
        
        return JsonResponse({"message": "File deleted successfully"}, status=200)

    except AuthenticationFailed:
        return JsonResponse({"error": "Invalid credentials"}, status=403)
    except UploadedFile.DoesNotExist:
        return JsonResponse({"error": "File not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


'''
# Ensure OpenAI API key is in settings.py
client = OpenAI(api_key=settings.OPENAI_API_KEY)
logger = logging.getLogger(__name__)
@csrf_exempt
def chatbot_response(request):
    """Handle chatbot queries and return OpenAI-generated responses."""
    logger.info("Chatbot view hit!")
    if request.method == "POST":
        try:
            # Extract user message from the request
            data = json.loads(request.body)
            user_message = data.get("message", "")

            if not user_message:
                return JsonResponse({"error": "Empty message"}, status=400)

            # ✅ Correct OpenAI API call for version 1.65.4
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an educational assistant helping faculty with syllabus improvement, question paper preparation, grading assessments, etc."},
                    {"role": "user", "content": user_message}
                ]
            )

            chatbot_reply = response.choices[0].message.content  # ✅ Extract response correctly
            return JsonResponse({"reply": chatbot_reply})

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method"}, status=405)
'''
# Ensure OpenAI API key is set
client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
logger = logging.getLogger(__name__)
@csrf_exempt  # ✅ Allows requests without CSRF validation
def chatbot_response(request):
    """Handle chatbot queries and return OpenAI-generated responses."""
    
    # ✅ Manually authenticate user before processing request
    if not request.user.is_authenticated:
        return JsonResponse({"error": "User not authenticated"}, status=401)

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user_message = data.get("message", "")

            if not user_message:
                return JsonResponse({"error": "Empty message"}, status=400)

            print("📡 Sending request to OpenAI:", user_message)

            # OpenAI API request
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an educational assistant helping faculty with syllabus improvement, question paper preparation, grading assessments, etc."},
                    {"role": "user", "content": user_message}
                ]
            )

            chatbot_reply = response.choices[0].message.content  
            print("✅ OpenAI Response:", chatbot_reply)  
            return JsonResponse({"reply": chatbot_reply})

        except openai.OpenAIError as e:
            print("❌ OpenAI API Error:", str(e))
            return JsonResponse({"error": "OpenAI API Error: " + str(e)}, status=500)

        except json.JSONDecodeError:
            print("❌ JSON Decode Error - Invalid Request")
            return JsonResponse({"error": "Invalid JSON format"}, status=400)

        except Exception as e:
            print("❌ General Server Error:", str(e))
            return JsonResponse({"error": "Server Error: " + str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method"}, status=405)