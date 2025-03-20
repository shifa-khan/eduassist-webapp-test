from django.db import models
from django.contrib.auth.models import User

# ============================================================
# CATEGORY CHOICES
CATEGORY_CHOICES = [
    ("assignments", "Assignments"),
    ("class_notes", "Class Notes"),
    ("syllabus", "Syllabus"),
]


# UPLOADED FILE MODEL
class UploadedFile(models.Model):
    """Stores files uploaded by users with categories."""
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # Each file belongs to a user
    file = models.FileField()  
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    uploaded_at = models.DateTimeField(auto_now_add=True)      # Auto-timestamp on upload

    def __str__(self):
        return f"{self.user.username} - {self.file.name}"
