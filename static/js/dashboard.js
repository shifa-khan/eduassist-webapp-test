// JS FOR DASHBOARD

document.addEventListener('DOMContentLoaded', function() {
    // File upload functionality
    const fileInput = document.getElementById('id_file');
    const fileDropArea = document.getElementById('file-drop-area');
    const fileNameDisplay = document.getElementById('selected-file-name');
    
    if (fileDropArea && fileInput) {
        fileDropArea.addEventListener('click', function() {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', function() {
            if (fileInput.files.length > 0) {
                fileNameDisplay.textContent = fileInput.files[0].name;
                fileDropArea.style.borderColor = '#4361ee';
            } else {
                fileNameDisplay.textContent = 'No file chosen';
                fileDropArea.style.borderColor = '#ced4da';
            }
        });
        
        // Drag and drop functionality
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            fileDropArea.style.borderColor = '#4361ee';
            fileDropArea.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';
        }
        
        function unhighlight() {
            fileDropArea.style.borderColor = '#ced4da';
            fileDropArea.style.backgroundColor = 'transparent';
        }
        
        fileDropArea.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            fileInput.files = files;
            
            if (files.length > 0) {
                fileNameDisplay.textContent = files[0].name;
            }
        }
    }

    // Global variable to store currently selected chat files
    window.selectedChatFiles = [];

    // Chatbot functionality
    const chatIcon = document.getElementById("chatbot-icon");
    const chatWindow = document.getElementById("chatbot-window");
    const chatClose = document.getElementById("chatbot-close");
    const chatInput = document.getElementById("chatbot-user-input");
    const chatSend = document.getElementById("chatbot-send");
    const messagesDiv = document.getElementById("chatbot-messages");
    const chatFileInput = document.getElementById("chat-file-input");
    const chatAttachButton = document.getElementById("chatbot-attach-file");

    // Get CSRF token function
    function getCSRFToken() {
        const csrfCookie = document.cookie
            .split(';')
            .find(cookie => cookie.trim().startsWith('csrftoken='));
        return csrfCookie ? csrfCookie.split('=')[1] : '';
    }

    // Load chat history function
    function loadChatHistory() {
        fetch('/api/chat-history/')
            .then(response => response.json())
            .then(data => {
                // Clear existing messages
                messagesDiv.innerHTML = '';
                
                // Add welcome message
                const welcomeMessage = document.createElement("div");
                welcomeMessage.className = "bot-message";
                welcomeMessage.textContent = "Hello! I'm your EduAssist chatbot. How can I help you today with your coursework?";
                messagesDiv.appendChild(welcomeMessage);
                
                // Add chat history
                if (data.chats && data.chats.length > 0) {
                    data.chats.reverse().forEach(chat => {
                        // Add user message
                        const userMessageDiv = document.createElement("div");
                        userMessageDiv.className = "user-message";
                        userMessageDiv.textContent = chat.message;
                        messagesDiv.appendChild(userMessageDiv);
                        
                        // Add bot response
                        const botMessageDiv = document.createElement("div");
                        botMessageDiv.className = "bot-message";
                        botMessageDiv.textContent = chat.response;
                        messagesDiv.appendChild(botMessageDiv);
                    });
                }
                
                // Scroll to bottom
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            })
            .catch(error => {
                console.error('Error loading chat history:', error);
            });
    }

    // Function to handle file upload for chat
    function uploadChatFile() {
        // In your uploadChatFile function, add this logging
        console.log("File type check:", fileExt, allowedTypes.includes(fileExt));
        const errorElement = document.getElementById('file-upload-error');
        const files = chatFileInput.files;
        
        // Reset error message
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
        
        if (files.length === 0) {
            return;
        }
        
        const file = files[0];
        
        // Check file type (same as server-side check)
        const allowedTypes = ['.txt', '.csv', '.md', '.pdf', '.docx', '.xlsx', '.pptx', '.jpg', '.jpeg', '.png'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedTypes.includes(fileExt)) {
            if (['.jpg', '.jpeg', '.png'].includes(fileExt)) {
                console.log("This is an image file, trying to upload anyway");
            } else {
                if (errorElement) {
                    errorElement.textContent = `File type ${fileExt} is not supported. Supported types: ${allowedTypes.join(', ')}`;
                    errorElement.style.display = 'block';
                }
                chatFileInput.value = '';
                return;
            }
        }
        
        // Check file size (5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            if (errorElement) {
                errorElement.textContent = 'File size exceeds the maximum limit of 5MB';
                errorElement.style.display = 'block';
            }
            chatFileInput.value = '';
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        // Show loading indicator
        const loadingEl = document.createElement('div');
        loadingEl.className = 'selected-file';
        loadingEl.innerHTML = `<span>${file.name} (Uploading...)</span>`;
        const selectedFilesEl = document.getElementById('selected-chat-files');
        if (selectedFilesEl) {
            selectedFilesEl.appendChild(loadingEl);
        }
        
        fetch('/api/upload-chat-file/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken()
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Remove loading indicator
            if (selectedFilesEl && loadingEl) {
                selectedFilesEl.removeChild(loadingEl);
            }
            
            if (data.error) {
                if (errorElement) {
                    errorElement.textContent = data.error;
                    errorElement.style.display = 'block';
                }
                return;
            }
            
            // Add file to selected files array
            window.selectedChatFiles.push({
                id: data.file_id,
                name: data.file_name
            });
            
            // Display selected file in UI
            displaySelectedChatFiles();
            
            // Clear file input
            chatFileInput.value = '';
        })
        .catch(error => {
            // Remove loading indicator
            if (selectedFilesEl && loadingEl) {
                selectedFilesEl.removeChild(loadingEl);
            }
            
            if (errorElement) {
                errorElement.textContent = 'Error uploading file. Please try again.';
                errorElement.style.display = 'block';
            }
            console.error('Error uploading file:', error);
            chatFileInput.value = '';
        });
    }

    // Function to display selected files in the chat UI
    function displaySelectedChatFiles() {
        const fileListElement = document.getElementById('selected-chat-files');
        if (!fileListElement) return;
        
        fileListElement.innerHTML = '';
        
        window.selectedChatFiles.forEach(file => {
            // Get file extension to show appropriate icon
            const fileName = file.name.split('/').pop(); // Get just the filename
            const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
            let iconClass = 'fas fa-file';
            
            // Assign icon based on file type
            if (fileExt === '.pdf') {
                iconClass = 'fas fa-file-pdf file-type-pdf';
            } else if (fileExt === '.docx') {
                iconClass = 'fas fa-file-word file-type-doc';
            } else if (fileExt === '.xlsx') {
                iconClass = 'fas fa-file-excel file-type-xls';
            } else if (fileExt === '.txt' || fileExt === '.md' || fileExt === '.csv') {
                iconClass = 'fas fa-file-alt file-type-txt';
            } else if (fileExt === '.jpg' || fileExt === '.jpeg' || fileExt === '.png') {
                iconClass = 'fas fa-file-image';
            }
            
            const fileElement = document.createElement('div');
            fileElement.className = 'selected-file';
            fileElement.innerHTML = `
                <i class="${iconClass} file-type-icon"></i>
                <span>${fileName}</span>
                <button type="button" data-file-id="${file.id}">✕</button>
            `;
            
            // Add click event for remove button
            const removeBtn = fileElement.querySelector('button');
            if (removeBtn) {
                removeBtn.addEventListener('click', function() {
                    const fileId = parseInt(this.getAttribute('data-file-id'));
                    removeSelectedFile(fileId);
                });
            }
            
            fileListElement.appendChild(fileElement);
        });
    }

    // Function to remove a selected file
    function removeSelectedFile(fileId) {
        window.selectedChatFiles = window.selectedChatFiles.filter(file => file.id !== fileId);
        displaySelectedChatFiles();
    }

    // Updated Send message function
    function sendMessage() {
        const message = chatInput.value.trim();
        if (message === "") return;

        // Get file IDs from selected files
        const fileIds = window.selectedChatFiles.map(file => file.id);

        // Add user message to chat
        const userMessageDiv = document.createElement("div");
        userMessageDiv.className = "user-message";
        
        // Create message content with file attachments if any
        let messageContent = message;
        if (window.selectedChatFiles.length > 0) {
            messageContent += `<div class="attached-files">
                <i class="fas fa-paperclip"></i> ${window.selectedChatFiles.length} file(s) attached
            </div>`;
        }
        
        userMessageDiv.innerHTML = messageContent;
        messagesDiv.appendChild(userMessageDiv);

        // Clear input
        chatInput.value = "";

        // Scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // Show typing indicator
        const typingIndicator = document.createElement("div");
        typingIndicator.className = "typing-indicator bot-message";
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        messagesDiv.appendChild(typingIndicator);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // Send to backend and get response
        fetch('/api/chatbot/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ 
                message: message,
                file_ids: fileIds
            })
        })
        .then(response => response.json())
        .then(data => {
            messagesDiv.removeChild(typingIndicator);

            // Add bot response
            const botMessageDiv = document.createElement("div");
            botMessageDiv.className = "bot-message";
            
            // Format response with line breaks
            botMessageDiv.innerHTML = data.response.replace(/\n/g, '<br>');
            messagesDiv.appendChild(botMessageDiv);

            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // Clear selected files after sending
            window.selectedChatFiles = [];
            displaySelectedChatFiles();
        })
        .catch(error => {
            messagesDiv.removeChild(typingIndicator);

            const errorMessageDiv = document.createElement("div");
            errorMessageDiv.className = "bot-message";
            errorMessageDiv.textContent = "Sorry, I'm having trouble connecting right now. Please try again later.";
            messagesDiv.appendChild(errorMessageDiv);

            console.error('Error:', error);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        });
    }

    // Chatbot event listeners
    if (chatIcon) {
        chatIcon.addEventListener("click", function() {
            chatWindow.style.display = chatWindow.style.display === "flex" ? "none" : "flex";
            if (chatWindow.style.display === "flex") {
                loadChatHistory();
                setTimeout(() => {
                    chatInput.focus();
                }, 100);
            }
        });
    }

    if (chatClose) {
        chatClose.addEventListener("click", function() {
            chatWindow.style.display = "none";
        });
    }

    if (chatSend) {
        chatSend.addEventListener("click", sendMessage);
    }

    if (chatInput) {
        chatInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                sendMessage();
            }
        });
    }
    
    // Add file upload event listeners
    if (chatFileInput) {
        chatFileInput.addEventListener('change', uploadChatFile);
    }
    
    if (chatAttachButton) {
        chatAttachButton.addEventListener('click', function() {
            chatFileInput.click();
        });
    }

    // Tab activation persistence with localStorage
    const tabLinks = document.querySelectorAll('.nav-tabs .nav-link');
    
    // Set active tab based on localStorage or default to first tab
    const activeTab = localStorage.getItem('activeTab') || '#assignments';
    const tabToActivate = document.querySelector(`[href="${activeTab}"]`);
    if (tabToActivate) {
        const tab = new bootstrap.Tab(tabToActivate);
        tab.show();
    }
    
    // Store active tab in localStorage when changed
    if (tabLinks) {
        tabLinks.forEach(link => {
            link.addEventListener('shown.bs.tab', function(e) {
                localStorage.setItem('activeTab', e.target.getAttribute('href'));
            });
        });
    }

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    if (tooltipTriggerList.length > 0) {
        tooltipTriggerList.map(function(tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    // Delete file functionality
    const deleteButtons = document.querySelectorAll('.delete-file');
    
    if (deleteButtons) {
        deleteButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const fileId = this.getAttribute('data-file-id');
                
                if (confirm('Are you sure you want to delete this file?')) {
                    fetch(`/delete-file/${fileId}/`, {
                        method: 'POST',  // Using POST since some browsers don't support DELETE with fetch
                        headers: {
                            'X-CSRFToken': getCSRFToken(),
                            'Content-Type': 'application/json'
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.message) {
                            // Remove the file item from the UI
                            this.closest('.file-item').remove();
                        } else {
                            alert('Failed to delete the file: ' + (data.error || 'Unknown error'));
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('An error occurred while deleting the file.');
                    });
                }
            });
        });
    }
});