// JS FOR DASHBOARD


    // File upload interaction
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

    // Chatbot functionality
    const chatIcon = document.getElementById("chatbot-icon");
    const chatWindow = document.getElementById("chatbot-window");
    const chatClose = document.getElementById("chatbot-close");
    const chatInput = document.getElementById("chatbot-user-input");
    const chatSend = document.getElementById("chatbot-send");
    const messagesDiv = document.getElementById("chatbot-messages");

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

    // Send message function
    function sendMessage() {
        const message = chatInput.value.trim();
        if (message === "") return;

        // Add user message to chat
        const userMessageDiv = document.createElement("div");
        userMessageDiv.className = "user-message";
        userMessageDiv.textContent = message;
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
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            messagesDiv.removeChild(typingIndicator);

            // Add bot response
            const botMessageDiv = document.createElement("div");
            botMessageDiv.className = "bot-message";
            botMessageDiv.textContent = data.response;
            messagesDiv.appendChild(botMessageDiv);

            messagesDiv.scrollTop = messagesDiv.scrollHeight;
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
