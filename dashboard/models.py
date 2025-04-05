from django.db import models
from django.contrib.auth.models import User
from storages.backends.gcloud import GoogleCloudStorage

# CATEGORY CHOICES
CATEGORY_CHOICES = [
    ("assignments", "Assignments"),
    ("class_notes", "Class Notes"),
    ("syllabus", "Syllabus"),
    ("chatbot_files", "Chatbot Files"),
]

# Create dedicated GCS storage instance with signing disabled
gcs_storage = GoogleCloudStorage(credentials=None, querystring_auth=False)

def upload_to_gcs(instance, filename):
    # This creates a clean path directly in the user's folder
    return f'{instance.user.username}/{filename}'

class UploadedFile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    file = models.FileField(upload_to=upload_to_gcs, storage=gcs_storage)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.file.name}"

class ChatMessage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    files = models.ManyToManyField(UploadedFile, blank=True, related_name='chat_messages')
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.user.username} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"