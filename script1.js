console.log("Chat script loaded.");

const firebaseConfig = {
  apiKey: "AIzaSyDgBBp8TATR616ssonog_W00mLoMzC5X6I",
  authDomain: "login-page-ce50f.firebaseapp.com",
  projectId: "login-page-ce50f",
  storageBucket: "login-page-ce50f.appspot.com",
  messagingSenderId: "274104600411",
  appId: "1:274104600411:web:0a0248a995bea745e33c7e",
  measurementId: "G-E1PKLWQHYB"
};
console.log("Firebase config:", firebaseConfig);

let app = null;
let database = null;
let storage = null;
let analytics = null;

let allowedUsersRef = null;
let onlineUsersRef = null;
let storageRef = null;
let groupsRef = null;

const loginContainer = document.getElementById('login-container');
const loginCodeInput = document.getElementById('login-code');
const loginNameInput = document.getElementById('login-name');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');
const firebaseChatInitErrorElement = document.getElementById('firebase-chat-init-error');

const chatContainer = document.getElementById('chat-container');
const chatHeader = document.getElementById('chat-header');
const userListToggleButton = document.getElementById('user-list-toggle-button');
const groupSelect = document.getElementById('group-select');
const headerTitleSpan = document.querySelector('#chat-header .header-title');
const groupNameSpan = document.getElementById('group-name');
const currentUsernameSpan = document.getElementById('current-username');

const userList = document.getElementById('user-list');
const userListUl = document.querySelector('#user-list ul');
const messageArea = document.getElementById('message-area');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const imageUploadButton = document.getElementById('image-upload-button');
const imageUploadInput = document.getElementById('image-upload-input');
const recordAudioButton = document.getElementById('record-audio-button');
const stopRecordingButton = document.getElementById('stop-recording-button');
const recordingIndicator = document.querySelector('.recording-indicator');
const scrollToBottomButton = document.getElementById('scroll-to-bottom');

const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const modalCloseButton = document.querySelector('.modal-close');
const modalDownloadButton = document.querySelector('.modal-download');

// Audio recording elements
const recordingTime = document.querySelector('.recording-time');
const recordingTimer = document.querySelector('.recording-timer');
const cancelRecordingButton = document.getElementById('cancel-recording-button');
const swipeIndicator = document.querySelector('.swipe-indicator');
const lockIndicator = document.querySelector('.lock-indicator');
const volumeIndicator = document.querySelector('.volume-indicator');
const recordingError = document.querySelector('.recording-error');
const retryRecordingButton = document.getElementById('retry-recording-button');
const limitWarning = document.querySelector('.limit-warning');
const qualityOptions = document.querySelector('.quality-options');
const formatOptions = document.querySelector('.format-options');
const helpContent = document.querySelector('.help-content');
const tutorialStep = document.querySelector('.tutorial-step');
const gotItButton = document.getElementById('got-it-button');
const lockScreen = document.querySelector('.lock-screen');
const lockScreenButton = document.querySelector('.lock-screen-button');
const recordingConfirmation = document.querySelector('.recording-confirmation');
const confirmationDuration = document.querySelector('.confirmation-duration');
const confirmButton = document.querySelector('.confirm-button');
const cancelButton = document.querySelector('.cancel-button');
const recordingPreview = document.querySelector('.recording-preview');
const previewAudio = document.querySelector('.preview-audio');
const sendPreviewButton = document.querySelector('.send-button');
const retryPreviewButton = document.querySelector('.retry-button');

let currentUser = null;
let currentUserId = null;
let currentGroupId = null;
let currentGroupName = null;
let messagesListener = null;

let isScrolling = false;
let isPinching = false;
let initialDistance = 0;
let initialX = 0;
let initialY = 0;
let currentScale = 1;

// Audio recording variables
let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;
let audioAnalyser = null;
let audioSource = null;
let audioBuffer = null;
let isRecording = false;
let audioDurationInterval = null;
let audioDuration = 0;
let isLocked = false;
let startY = 0;
let currentY = 0;
let maxDuration = 300; // 5 minutes max
let recordingQuality = 'high'; // high, medium, low
let recordingFormat = 'mp3'; // mp3, wav, ogg
let audioStream = null;

// ===== Enhanced Audio Recording Functions =====

// Function to request microphone permission
async function requestMicrophonePermission() {
    try {
        // Request permission first without starting recording
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Stop the stream immediately as we just want to check permission
        stream.getTracks().forEach(track => track.stop());
        
        return true;
    } catch (error) {
        console.error("Error accessing microphone:", error);
        return false;
    }
}

// Show microphone permission error
function showMicrophonePermissionError() {
    const errorMessage = `
        <div class="permission-prompt">
            <h3>يحتاج التسجيل الصوتي إلى إذن استخدام الميكروفون</h3>
            <p>لم يتم منح الإذن لاستخدام الميكروفون. الرجاء:</p>
            <ol>
                <li>النقر على "السماح" عند ظهور مطالبة الإذن</li>
                <li>تحديث الصفحة والمحاولة مرة أخرى</li>
                <li>التحقق من إعدادات المتصفح إذا لم تظهر المطالبة</li>
            </ol>
            <button id="retry-permission-button">المحاولة مرة أخرى</button>
        </div>
    `;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = errorMessage;
    document.body.appendChild(tempDiv);
    
    // Add event handler for retry button
    const retryButton = document.getElementById('retry-permission-button');
    if (retryButton) {
        retryButton.addEventListener('click', async () => {
            tempDiv.remove();
            const hasPermission = await requestMicrophonePermission();
            if (hasPermission) {
                startRecording();
            } else {
                showToast('لم يتم منح إذن استخدام الميكروفون');
            }
        });
    }
}

// Show recording error with more details
function showRecordingError(error) {
    let errorMessage = 'حدث خطأ أثناء محاولة الوصول إلى الميكروفون';
    
    if (error.name === 'NotAllowedError') {
        errorMessage = 'تم رفض الإذن باستخدام الميكروفون';
    } else if (error.name === 'NotFoundError') {
        errorMessage = 'لم يتم العثور على جهاز ميكروفون';
    } else if (error.name === 'NotReadableError') {
        errorMessage = 'لا يمكن قراءة بيانات الميكروفون، قد يكون قيد الاستخدام من قبل تطبيق آخر';
    }
    
    recordingError.innerHTML = `
        <h3>خطأ في التسجيل الصوتي</h3>
        <p>${errorMessage}</p>
        <button id="retry-recording-button">إعادة المحاولة</button>
        <button id="check-settings-button">فحص الإعدادات</button>
        <p>تلميح: تأكد من منح الإذن للموقع باستخدام الميكروفون</p>
    `;
    
    recordingError.style.display = 'flex';
    
    // Add event handlers for new buttons
    const retryButton = document.getElementById('retry-recording-button');
    const settingsButton = document.getElementById('check-settings-button');
    
    if (retryButton) {
        retryButton.addEventListener('click', async () => {
            recordingError.style.display = 'none';
            
            // Check permission first
            const hasPermission = await requestMicrophonePermission();
            
            if (hasPermission) {
                startRecording();
            } else {
                showMicrophonePermissionError();
            }
        });
    }
    
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            showToast('الرجاء التحقق من إعدادات الميكروفون في المتصفح');
            
            // Can open browser settings page if possible
            if (chrome && chrome.tabs) {
                chrome.tabs.create({ url: 'chrome://settings/content/microphone' });
            } else if (navigator.permissions) {
                navigator.permissions.query({ name: 'microphone' }).then(permissionStatus => {
                    console.log('حالة إذن الميكروفون:', permissionStatus.state);
                });
            }
        });
    }
}

// Start audio recording
async function startRecording() {
    if (isRecording) return;
    
    // Check permission first
    const hasPermission = await requestMicrophonePermission();
    
    if (!hasPermission) {
        showMicrophonePermissionError();
        return;
    }
    
    try {
        // التحقق من الإذن أولاً
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // إعادة تعيين المتغيرات
        audioChunks = [];
        audioDuration = 0;
        isRecording = true;
        isLocked = false;
        
        // تحديث واجهة المستخدم
        recordAudioButton.classList.add('recording');
        recordingIndicator.style.display = 'block';
        cancelRecordingButton.style.display = 'block';
        swipeIndicator.style.display = 'block';
        lockIndicator.style.display = 'none';
        
        // بدء مؤقت التسجيل
        audioDurationInterval = setInterval(() => {
            audioDuration++;
            recordingTime.textContent = formatTime(audioDuration);
            recordingTimer.textContent = formatTime(audioDuration);
            
            const progress = (audioDuration / maxDuration) * 100;
            document.querySelector('.recording-progress-bar').style.width = `${progress}%`;
            
            if (audioDuration >= maxDuration - 30) {
                limitWarning.style.display = 'block';
            }
            
            if (audioDuration >= maxDuration) {
                stopRecording();
            }
        }, 1000);
        
        // إنشاء سياق الصوت
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioAnalyser = audioContext.createAnalyser();
        audioSource = audioContext.createMediaStreamSource(stream);
        audioSource.connect(audioAnalyser);
        
        // تهيئة MediaRecorder
        const options = {
            mimeType: `audio/webm`,
            audioBitsPerSecond: recordingQuality === 'high' ? 128000 : 
                               recordingQuality === 'medium' ? 64000 : 32000
        };
        
        mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorder.start();
        
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            showRecordingPreview(audioBlob);
        };
        
        // تحليل مستوى الصوت
        analyzeAudio();
        
        // حفظ المرجع للتيار
        audioStream = stream;
        
    } catch (error) {
        console.error("Error accessing microphone:", error);
        showRecordingError(error);
        stopRecording();
    }
}

// Analyze audio level for visual effects
function analyzeAudio() {
    if (!isRecording || !audioAnalyser) return;
    
    const bufferLength = audioAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    audioAnalyser.getByteFrequencyData(dataArray);
    
    // Update visual effects
    updateVisualizer(dataArray);
    updateVolumeLevel(dataArray);
    
    // Continue analysis
    if (isRecording) {
        requestAnimationFrame(analyzeAudio);
    }
}

// Update recording visualizer
function updateVisualizer(dataArray) {
    const bars = document.querySelectorAll('.visualizer-bar');
    if (bars.length === 0) return;
    
    const step = Math.floor(dataArray.length / bars.length);
    bars.forEach((bar, i) => {
        const index = i * step;
        const value = dataArray[index] / 255;
        const height = 10 + (value * 20);
        bar.style.height = `${height}px`;
    });
}

// Update volume level indicator
function updateVolumeLevel(dataArray) {
    const levels = document.querySelectorAll('.volume-level');
    if (levels.length === 0) return;
    
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = sum / dataArray.length;
    const volume = average / 255;
    
    // Update volume level indicator
    const activeLevels = Math.floor(volume * levels.length);
    levels.forEach((level, i) => {
        if (i < activeLevels) {
            level.classList.add('active');
        } else {
            level.classList.remove('active');
        }
    });
    
    // Show volume indicator if loud
    if (volume > 0.7) {
        volumeIndicator.style.display = 'flex';
        setTimeout(() => {
            volumeIndicator.style.display = 'none';
        }, 1000);
    }
}

// Stop audio recording
function stopRecording() {
    if (!isRecording) return;
    
    isRecording = false;
    clearInterval(audioDurationInterval);
    
    // Hide UI elements
    recordAudioButton.classList.remove('recording');
    recordingIndicator.style.display = 'none';
    cancelRecordingButton.style.display = 'none';
    swipeIndicator.style.display = 'none';
    lockIndicator.style.display = 'none';
    limitWarning.style.display = 'none';
    
    // Stop MediaRecorder if running
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    // Stop audio stream
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }
    
    // Close audio context
    if (audioContext) {
        if (audioContext.state !== 'closed') {
            audioContext.close();
        }
        audioContext = null;
        audioAnalyser = null;
        audioSource = null;
    }
}

// Cancel recording
function cancelRecording() {
    stopRecording();
    showToast('تم إلغاء التسجيل');
}

// Lock recording
function lockRecording() {
    isLocked = true;
    lockIndicator.style.display = 'block';
    swipeIndicator.style.display = 'none';
    showToast('تم قفل التسجيل');
}

// Unlock recording
function unlockRecording() {
    isLocked = false;
    lockIndicator.style.display = 'none';
    showToast('تم فتح التسجيل');
}

// Show recording preview
function showRecordingPreview(audioBlob) {
    if (!audioBlob || audioBlob.size === 0) {
        showToast('فشل تسجيل الصوت');
        return;
    }
    
    // Show preview window
    recordingPreview.style.display = 'flex';
    confirmationDuration.textContent = formatTime(audioDuration);
    
    // Set audio for preview
    const audioUrl = URL.createObjectURL(audioBlob);
    previewAudio.src = audioUrl;
    
    // Button events
    sendPreviewButton.onclick = () => {
        recordingPreview.style.display = 'none';
        sendAudioMessage(audioBlob);
    };
    
    retryPreviewButton.onclick = () => {
        recordingPreview.style.display = 'none';
        startRecording();
    };
}

// Send audio message
function sendAudioMessage(audioBlob) {
    if (!currentUser || !currentGroupId || !storage) {
        showToast('لا يمكن إرسال الرسالة الصوتية');
        return;
    }
    
    const fileName = `${Date.now()}_${currentUser.userId}.${recordingFormat}`;
    const audioFileRef = storageRef.child(`audio_messages/${currentUser.userId}/${fileName}`);
    
    const uploadTask = audioFileRef.put(audioBlob);
    
    uploadTask.on('state_changed',
        snapshot => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Audio upload progress:', progress.toFixed(2) + '%');
        },
        error => {
            console.error("Audio upload failed:", error);
        },
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then(downloadURL => {
                const groupMessagesRef = database.ref('groupMessages').child(currentGroupId);
                const newMessage = {
                    type: 'audio',
                    senderName: currentUser.name,
                    senderId: currentUser.userId,
                    audioUrl: downloadURL,
                    duration: audioDuration,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };
                
                groupMessagesRef.push(newMessage)
                    .then(() => {
                        console.log("Audio message sent successfully.");
                        showToast('تم إرسال الرسالة الصوتية');
                    })
                    .catch(error => {
                        console.error("Error sending audio message:", error);
                        showToast('فشل إرسال الرسالة الصوتية');
                    });
            });
        }
    );
}

// Check for saved login credentials
function checkSavedCredentials() {
    const savedCode = localStorage.getItem('savedCode');
    const savedName = localStorage.getItem('savedName');
    
    if (savedCode && savedName) {
        loginCodeInput.value = savedCode;
        loginNameInput.value = savedName;
        setTimeout(() => {
            loginButton.click();
        }, 500);
    }
}

function generatePersistentUserId(code, name) {
     return `${code}_${name.toLowerCase().replace(/\s+/g, '').replace(/[.#$\[\]]/g, '_')}`;
}

function scrollToBottom() {
     if(messageArea) {
        messageArea.scrollTop = messageArea.scrollHeight;
        messageArea.classList.remove('scrolling');
     }
}

function toggleScrollButton() {
     if(messageArea && scrollToBottomButton) {
        if (messageArea.scrollHeight - messageArea.scrollTop > messageArea.clientHeight + 100) {
            scrollToBottomButton.classList.add('show');
        } else {
            scrollToBottomButton.classList.remove('show');
        }
     }
}

function playNotificationSound() {
     try {
         const audio = new Audio('data:audio/wav;base64,UklGRlIAAABXQVZFZm10RBIADAAAAAEAAQIAQB8AAEAfAAABAAEAaW5mbwAAAEkAAADgfEJUUkxUBAAAAgAAAFJpcpYdHA==')
         audio.play().catch(e => console.warn("Error playing sound:", e.message));
     } catch (e) {
         console.warn("Browser does not support Audio API or playback failed:", e.message);
     }
}

function showLogin() {
    if(loginContainer) loginContainer.style.display = 'block';
    if(chatContainer) chatContainer.style.display = 'none';
     if (window.innerWidth <= 768 && chatContainer) {
         chatContainer.classList.remove('user-list-visible');
         if(userList) userList.style.display = 'none';
     }
}

function showChat() {
    if(loginContainer) loginContainer.style.display = 'none';
    if(chatContainer) chatContainer.style.display = 'grid';

     if(messageArea) {
         messageArea.addEventListener('scroll', toggleScrollButton);
         toggleScrollButton();
     }

     if (window.innerWidth <= 768 && userList) {
         userList.style.display = 'none';
     }

     if(window.innerWidth <= 768 && userListToggleButton) {
         userListToggleButton.style.display = 'block';
     } else if (userListToggleButton) {
         userListToggleButton.style.display = 'none';
     }
}

// Function to display image group messages
function displayImageGroup(images, senderName, senderId, messageId) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.dataset.messageId = messageId;

    const isMyMessage = currentUser && senderId === currentUser.userId;

    if (isMyMessage) {
        messageElement.classList.add('my-message');
    } else {
        messageElement.classList.add('other-message');
    }

    const avatarElement = document.createElement('div');
    avatarElement.classList.add('message-avatar');
    avatarElement.textContent = senderName ? senderName.substring(0, 2).toUpperCase() : '??';

    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');

    const senderElement = document.createElement('div');
    senderElement.classList.add('message-sender');
    senderElement.textContent = senderName || 'Unknown user';
    contentElement.appendChild(senderElement);

    const imageGroupContainer = document.createElement('div');
    imageGroupContainer.classList.add('image-group-container');

    const imageGroup = document.createElement('div');
    imageGroup.classList.add('image-group');

    // Display first 4 images in grid
    const imagesToShow = images.slice(0, 4);
    imagesToShow.forEach((imageUrl, index) => {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.dataset.imageUrl = imageUrl;
        img.classList.add('message-image');
        img.onclick = function() {
            modalImage.src = imageUrl;
            imageModal.style.display = 'flex';
            modalDownloadButton.dataset.imageUrl = imageUrl;
        };
        imageGroup.appendChild(img);
    });

    imageGroupContainer.appendChild(imageGroup);

    // Show count if more than 4 images
    if (images.length > 4) {
        const countElement = document.createElement('div');
        countElement.classList.add('image-group-count');
        countElement.textContent = `+${images.length - 4}`;
        imageGroupContainer.appendChild(countElement);
    }

    contentElement.appendChild(imageGroupContainer);

    if (isMyMessage && database && currentGroupId && messageId) {
        const messageRef = database.ref('groupMessages').child(currentGroupId).child(messageId);

        const deleteButtonElement = document.createElement('button');
        deleteButtonElement.classList.add('delete-button');
        deleteButtonElement.textContent = 'x';
        deleteButtonElement.title = 'Delete message';
        deleteButtonElement.addEventListener('click', () => {
            messageRef.remove()
                .then(() => console.log("Message removed successfully:", messageId))
                .catch(error => console.error("Error removing message:", error));
        });
        contentElement.appendChild(deleteButtonElement);
    }

    if (isMyMessage) {
        messageElement.appendChild(contentElement);
        messageElement.appendChild(avatarElement);
    } else {
        messageElement.appendChild(avatarElement);
        messageElement.appendChild(contentElement);
    }

    messageArea.appendChild(messageElement);

    if (isMyMessage || (messageArea.scrollHeight - messageArea.scrollTop - messageArea.clientHeight) < 200) {
        setTimeout(scrollToBottom, 100);
    }

    if (!isMyMessage && document.visibilityState === 'visible') {
        playNotificationSound();
    }
}

// Function to display messages
function displayMessage(message) {
    if (!messageArea) return;

    // Handle image groups
    if (message.type === 'image-group' && message.images && message.images.length > 0) {
        displayImageGroup(message.images, message.senderName, message.senderId, message.key);
        return;
    }

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.dataset.messageId = message.key;

    const isMyMessage = currentUser && message.senderId === currentUser.userId;

    if (isMyMessage) {
        messageElement.classList.add('my-message');
    } else {
        messageElement.classList.add('other-message');
    }

    const avatarElement = document.createElement('div');
    avatarElement.classList.add('message-avatar');
    avatarElement.textContent = message.senderName ? message.senderName.substring(0, 2).toUpperCase() : '??';

    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');

    const senderElement = document.createElement('div');
    senderElement.classList.add('message-sender');
    senderElement.textContent = message.senderName || 'Unknown user';
    contentElement.appendChild(senderElement);

    if (message.type === 'text') {
        const textElement = document.createElement('div');
        textElement.classList.add('message-text');
        textElement.textContent = message.text;
        contentElement.appendChild(textElement);
    } else if (message.type === 'image' && message.imageUrl) {
        const imgElement = document.createElement('img');
        imgElement.classList.add('message-image');
        imgElement.src = message.imageUrl;
        imgElement.classList.add('loading');
        imgElement.onload = () => {
            imgElement.classList.remove('loading');
            if (messageArea.scrollHeight - messageArea.scrollTop - messageArea.clientHeight < 50) {
                scrollToBottom();
            }
        };
        imgElement.onerror = () => {
            console.error("Failed to load image:", message.imageUrl);
            const errorText = document.createElement('div');
            errorText.classList.add('message-text');
            errorText.style.color = 'red';
            errorText.textContent = 'Failed to load image';
            contentElement.appendChild(errorText);
        };
        imgElement.dataset.imageUrl = message.imageUrl;
        contentElement.appendChild(imgElement);
    } else if (message.type === 'audio' && message.audioUrl) {
        // Display audio message
        const audioContainer = document.createElement('div');
        audioContainer.classList.add('audio-message');
        
        const audioControls = document.createElement('div');
        audioControls.classList.add('audio-controls');
        
        const playButton = document.createElement('button');
        playButton.classList.add('play-pause-button');
        playButton.innerHTML = '&#9658;'; // Play symbol
        
        const progressContainer = document.createElement('div');
        progressContainer.classList.add('audio-progress');
        
        const progressBar = document.createElement('div');
        progressBar.classList.add('audio-progress-played');
        progressContainer.appendChild(progressBar);
        
        const durationDisplay = document.createElement('div');
        durationDisplay.classList.add('audio-duration');
        durationDisplay.textContent = formatTime(message.duration || 0);
        
        audioControls.appendChild(playButton);
        audioControls.appendChild(progressContainer);
        audioControls.appendChild(durationDisplay);
        
        audioContainer.appendChild(audioControls);
        contentElement.appendChild(audioContainer);
        
        // Audio player functions
        let audioElement = null;
        let isPlaying = false;
        
        playButton.addEventListener('click', () => {
            if (!audioElement) {
                audioElement = new Audio(message.audioUrl);
                audioElement.addEventListener('timeupdate', () => {
                    const progress = (audioElement.currentTime / audioElement.duration) * 100;
                    progressBar.style.width = `${progress}%`;
                    durationDisplay.textContent = formatTime(audioElement.currentTime) + ' / ' + formatTime(audioElement.duration);
                });
                audioElement.addEventListener('ended', () => {
                    progressBar.style.width = '0%';
                    durationDisplay.textContent = formatTime(audioElement.duration);
                    playButton.innerHTML = '&#9658;';
                    isPlaying = false;
                });
            }
            
            if (isPlaying) {
                audioElement.pause();
                playButton.innerHTML = '&#9658;';
                isPlaying = false;
            } else {
                audioElement.play();
                playButton.innerHTML = '&#10074;&#10074;'; // Pause symbol
                isPlaying = true;
            }
        });
    }

    if (isMyMessage && database && currentGroupId && message.key) {
        const messageRef = database.ref('groupMessages').child(currentGroupId).child(message.key);

        const deleteButtonElement = document.createElement('button');
        deleteButtonElement.classList.add('delete-button');
        deleteButtonElement.textContent = 'x';
        deleteButtonElement.title = 'Delete message';
        deleteButtonElement.addEventListener('click', () => {
            messageRef.remove()
                .then(() => console.log("Message removed successfully:", message.key))
                .catch(error => console.error("Error removing message:", error));
        });
        contentElement.appendChild(deleteButtonElement);
    }

    if (isMyMessage) {
        messageElement.appendChild(contentElement);
        messageElement.appendChild(avatarElement);
    } else {
        messageElement.appendChild(avatarElement);
        messageElement.appendChild(contentElement);
    }

    messageArea.appendChild(messageElement);

    if (isMyMessage || (messageArea.scrollHeight - messageArea.scrollTop - messageArea.clientHeight) < 200) {
        setTimeout(scrollToBottom, 100);
    }

    if (!isMyMessage && document.visibilityState === 'visible') {
        playNotificationSound();
    }
}

// Format time
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Update online users list
function updateOnlineUsersList(users) {
    if (!userListUl) return;
    userListUl.innerHTML = '';
    if (users) {
        const sortedUserIds = Object.keys(users).sort((uidA, uidB) => {
            const userA = users[uidA];
            const userB = users[uidB];

            if (!userA || !userB) return 0;

            if (userA.isOnline && !userB.isOnline) return -1;
            if (!userA.isOnline && userB.isOnline) return 1;

            const nameA = userA.name || '';
            const nameB = userB.name || '';
            return nameA.localeCompare(nameB, 'ar');
        });

        sortedUserIds.forEach(userId => {
            const user = users[userId];
            if (!user || !user.name) {
                console.warn("Skipping invalid user entry in online list:", user);
                return;
            }

            const li = document.createElement('li');

            const statusSpan = document.createElement('span');
            statusSpan.classList.add(user.isOnline ? 'online-status' : 'offline-status');
            statusSpan.title = user.isOnline ? 'Online' : 'Offline';

            li.appendChild(statusSpan);
            li.appendChild(document.createTextNode(user.name));

            if (!user.isOnline && user.lastSeen) {
                const lastSeenSpan = document.createElement('span');
                lastSeenSpan.classList.add('last-seen');
                const lastSeenTime = new Date(user.lastSeen);
                try {
                    lastSeenSpan.textContent = ` (آخر ظهور: ${lastSeenTime.toLocaleDateString('ar-EG')} ${lastSeenTime.toLocaleTimeString('ar-EG')})`;
                } catch (e) {
                    console.error("Error formatting last seen date:", user.lastSeen, e);
                    lastSeenSpan.textContent = ` (آخر ظهور: غير معروف)`;
                }
                li.appendChild(lastSeenSpan);
            }

            userListUl.appendChild(li);
        });
    }
}

// Update chat header title
function updateChatHeaderTitle(groupName, userName) {
    if(groupNameSpan) {
        groupNameSpan.textContent = groupName || 'Group not specified';
    }
    if(currentUsernameSpan) {
        currentUsernameSpan.textContent = userName ? `أنت: ${userName}` : '';
    }
}

// Populate group select
function populateGroupSelect(groups) {
    if (!groupSelect) return;
    const previouslySelectedGroupId = groupSelect.value;
    groupSelect.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'اختر مجموعة...';
    defaultOption.disabled = true;
    groupSelect.appendChild(defaultOption);

    let restoredSelection = false;
    if (groups) {
        Object.keys(groups).forEach(groupId => {
            const group = groups[groupId];
            if (group && group.name) {
                const option = document.createElement('option');
                option.value = groupId;
                option.textContent = group.name;
                if (groupId === previouslySelectedGroupId) {
                    option.selected = true;
                    restoredSelection = true;
                }
                groupSelect.appendChild(option);
            }
        });
    }
    if (!restoredSelection) {
        defaultOption.selected = true;
    }
}

// Select group
function selectGroup(groupId, groupName) {
    console.log(`Attempting to select group: ${groupId} (${groupName})`);

    if (!database) {
        console.error("Firebase Database not initialized.");
        return;
    }

    if (messagesListener && currentGroupId && currentGroupId !== groupId) {
        console.log(`Detaching message listener for old group: ${currentGroupId}`);
        database.ref('groupMessages').child(currentGroupId).off('child_added', messagesListener);
        messagesListener = null;
    } else if (currentGroupId === groupId && messagesListener) {
        console.log("Group already selected and listener active:", groupId);
        if(currentUser) updateChatHeaderTitle(groupName, currentUser.name); else updateChatHeaderTitle(groupName, '');
        return;
    }

    if(messageArea) messageArea.innerHTML = '';
    console.log("Cleared message area for new group.");

    currentGroupId = groupId;
    currentGroupName = groupName;
    console.log(`Current group state updated: ${currentGroupId} (${currentGroupName})`);

    if(currentUser) {
        updateChatHeaderTitle(currentGroupName, currentUser.name);
    } else {
        updateChatHeaderTitle(currentGroupName, '');
    }

    if (currentGroupId) {
        console.log(`Attaching message listener for group: ${currentGroupId}`);
        const groupMessagesRef = database.ref('groupMessages').child(currentGroupId);

        messagesListener = groupMessagesRef.orderByChild('timestamp').on('child_added', snapshot => {
            const message = snapshot.val();
            message.key = snapshot.key;
            console.log("New message received (group listener):", message);
            displayMessage(message);
        }, error => {
            console.error(`Error listening to messages for group ${currentGroupId}:`, error);
        });

        setTimeout(scrollToBottom, 500);

        if(messageInput) messageInput.disabled = false;
        if(sendButton) sendButton.disabled = false;
        if(imageUploadButton) imageUploadButton.disabled = false;
        if(recordAudioButton) recordAudioButton.disabled = false;
    } else {
        console.log("No group selected, message listener not attached.");
        if(messageInput) messageInput.disabled = true;
        if(sendButton) sendButton.disabled = true;
        if(imageUploadButton) imageUploadButton.disabled = true;
        if(recordAudioButton) recordAudioButton.disabled = true;
    }
}

// Show toast message
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ===== Firebase Initialization =====
try {
    app = firebase.initializeApp(firebaseConfig);
    database = app.database();
    storage = app.storage();
    analytics = firebase.analytics();

    allowedUsersRef = database.ref('allowedUsers');
    onlineUsersRef = database.ref('onlineUsers');
    groupsRef = database.ref('groups');
    storageRef = storage.ref('chat_images');

    console.log("Firebase chat initialized successfully. References ready.");

    // Check for saved login credentials
    checkSavedCredentials();

    if(groupsRef && groupSelect) {
        groupsRef.on('value', snapshot => {
            const groupsData = snapshot.val();
            console.log("Groups list received/updated:", groupsData);
            populateGroupSelect(groupsData);

            if (currentGroupId && groupsData && groupsData[currentGroupId] && groupsData[currentGroupId].name !== currentGroupName) {
                currentGroupName = groupsData[currentGroupId].name;
                if (currentUser) {
                    updateChatHeaderTitle(currentGroupName, currentUser.name);
                } else {
                    updateChatHeaderTitle(currentGroupName, '');
                }
            }
            else if (!currentGroupId && currentUser && groupsData && Object.keys(groupsData).length > 0) {
                const firstGroupId = Object.keys(groupsData)[0];
                if (firstGroupId && groupSelect.querySelector(`option[value="${firstGroupId}"]`)) {
                    groupSelect.value = firstGroupId;
                    selectGroup(firstGroupId, groupsData[firstGroupId].name || firstGroupId);
                }
            } else if ((!groupsData || Object.keys(groupsData).length === 0) && currentUser) {
                console.warn("No groups available in Firebase.");
                updateChatHeaderTitle("لا توجد مجموعات متاحة", currentUser.name);
                if(messageInput) messageInput.disabled = true;
                if(sendButton) sendButton.disabled = true;
                if(imageUploadButton) imageUploadButton.disabled = true;
                if(recordAudioButton) recordAudioButton.disabled = true;
            }
        }, error => {
            console.error("Error listening to groups list:", error);
            updateChatHeaderTitle("خطأ في تحميل المجموعات", currentUser ? currentUser.name : '');
            if(messageInput) messageInput.disabled = true;
            if(sendButton) sendButton.disabled = true;
            if(imageUploadButton) imageUploadButton.disabled = true;
            if(recordAudioButton) recordAudioButton.disabled = true;
        });
        console.log("Groups list listener attached.");
    } else {
        console.error("Groups select element or Firebase refs not found. Group feature disabled.");
        updateChatHeaderTitle("خطأ في تهيئة المجموعات", currentUser ? currentUser.name : '');
        if(messageInput) messageInput.disabled = true;
        if(sendButton) sendButton.disabled = true;
        if(imageUploadButton) imageUploadButton.disabled = true;
        if(recordAudioButton) recordAudioButton.disabled = true;
    }

    if(onlineUsersRef && userListUl) {
        onlineUsersRef.on('value', snapshot => {
            const onlineUsersData = snapshot.val();
            console.log("Online users data received (global listener):", onlineUsersData);
            updateOnlineUsersList(onlineUsersData);
        }, error => {
            console.error("Error listening to online users:", error);
        });
        console.log("Online users listener attached.");
    } else {
        console.error("Online users list element or Firebase refs not found. Online user list disabled.");
    }
} catch (error) {
    console.error("Firebase chat initialization failed:", error);
    if(firebaseChatInitErrorElement) {
        firebaseChatInitErrorElement.textContent = 'فشل تهيئة Firebase للدردشة. الرجاء التحقق من الإعدادات واتصال الإنترنت. الخطأ: ' + error.message;
    } else {
        if(loginError) loginError.textContent = 'فشل تهيئة Firebase. الرجاء التحقق من الإعدادات واتصال الإنترنت.';
        else alert('فشل تهيئة Firebase. الرجاء التحقق من الإعدادات واتصال الإنترنت.');
    }

    if(loginButton) loginButton.disabled = true;
    if(loginCodeInput) loginCodeInput.disabled = true;
    if(loginNameInput) loginNameInput.disabled = true;
    if(messageInput) messageInput.disabled = true;
    if(sendButton) sendButton.disabled = true;
    if(imageUploadButton) imageUploadButton.disabled = true;
    if(recordAudioButton) recordAudioButton.disabled = true;
    if(groupSelect) groupSelect.disabled = true;
}

// ===== Event Handlers =====

// Login
if (loginButton && loginCodeInput && loginNameInput && database) {
    loginButton.addEventListener('click', () => {
        const code = loginCodeInput.value.trim();
        const name = loginNameInput.value.trim();
        if(loginError) loginError.textContent = '';

        if (!code || !name) {
            if(loginError) loginError.textContent = 'الرجاء إدخال كل من الكود والاسم.';
            return;
        }

        console.log(`Login attempt with code: ${code}, name: ${name}`);

        if (!allowedUsersRef || !onlineUsersRef) {
            if(loginError) loginError.textContent = 'نظام التحقق أو الحضور غير جاهز. حاول مرة أخرى.';
            console.error("Firebase refs (allowedUsersRef or onlineUsersRef) not initialized.");
            return;
        }

        allowedUsersRef.child(code).once('value', snapshot => {
            if (snapshot.exists()) {
                const storedUserData = snapshot.val();
                const expectedName = storedUserData.name;

                if (expectedName && name.toLowerCase() === expectedName.toLowerCase()) {
                    console.log("Login code and name are valid.");
                    currentUserId = generatePersistentUserId(code, name);
                    currentUser = { code: code, name: name, userId: currentUserId };

                    // Save credentials for auto-login
                    localStorage.setItem('savedCode', code);
                    localStorage.setItem('savedName', name);

                    const userStatusRef = onlineUsersRef.child(currentUserId);
                    const userDataOnline = {
                        name: currentUser.name,
                        isOnline: true,
                        lastSeen: firebase.database.ServerValue.TIMESTAMP
                    };
                    const userDataOffline = {
                        name: currentUser.name,
                        isOnline: false,
                        lastSeen: firebase.database.ServerValue.TIMESTAMP
                    };

                    userStatusRef.onDisconnect().set(userDataOffline)
                        .then(() => {
                            console.log("onDisconnect handler set for user:", currentUserId);
                            return userStatusRef.set(userDataOnline);
                        })
                        .then(() => {
                            console.log("User set as online. Showing chat.");
                            showChat();
                            updateChatHeaderTitle(currentGroupName, currentUser.name);

                            if (!currentGroupId && groupSelect && groupSelect.options.length > 0) {
                                let firstSelectableOption = null;
                                for(let i=0; i < groupSelect.options.length; i++) {
                                    if (!groupSelect.options[i].disabled && groupSelect.options[i].value) {
                                        firstSelectableOption = groupSelect.options[i];
                                        break;
                                    }
                                }

                                if (firstSelectableOption) {
                                    groupSelect.value = firstSelectableOption.value;
                                    console.log(`Auto-selecting group: ${firstSelectableOption.value} - ${firstSelectableOption.text}`);
                                    selectGroup(firstSelectableOption.value, firstSelectableOption.text);
                                } else {
                                    console.warn("No selectable group found to auto-select.");
                                    if(messageInput) messageInput.disabled = true;
                                    if(sendButton) sendButton.disabled = true;
                                    if(imageUploadButton) imageUploadButton.disabled = true;
                                    if(recordAudioButton) recordAudioButton.disabled = true;
                                }
                            } else if (currentGroupId && currentGroupName) {
                                selectGroup(currentGroupId, currentGroupName);
                            }
                        })
                        .catch(error => {
                            console.error("Error setting user online or onDisconnect:", error);
                            if(loginError) loginError.textContent = 'خطأ في تعيين حالة الاتصال. حاول مرة أخرى.';
                            currentUser = null; currentUserId = null;
                        });

                } else {
                    console.log("Login code is valid, but name is incorrect.");
                    if(loginError) loginError.textContent = 'الاسم الذي تم إدخاله غير صحيح لهذا الكود.';
                }
            } else {
                console.log("Login code is invalid.");
                if(loginError) loginError.textContent = 'الكود الذي تم إدخاله غير صحيح.';
            }
        }, error => {
            console.error("Error accessing allowed users:", error);
            if(loginError) loginError.textContent = 'خطأ في التحقق من الكود. حاول مرة أخرى.';
        });
    });
    console.log("Login button event listener attached.");
} else {
    console.error("Could not attach login button event listener. Crucial elements or Firebase database ref missing.");
    if(loginContainer && loginContainer.style.display !== 'none' && loginError) {
        loginError.textContent = "خطأ في تهيئة زر الدخول. حاول تحديث الصفحة.";
    }
}

// Group selection
if(groupSelect) {
    groupSelect.addEventListener('change', (event) => {
        const selectedGroupId = event.target.value;
        const selectedOption = event.target.options[event.target.selectedIndex];
        const selectedGroupName = selectedOption ? selectedOption.text : null;
        if (selectedGroupId && selectedGroupName && selectedOption && !selectedOption.disabled) {
            selectGroup(selectedGroupId, selectedGroupName);
        } else if (!selectedGroupId) {
            console.warn("Default 'select group' option chosen. No action taken.");
            if(messageInput) messageInput.disabled = true;
            if(sendButton) sendButton.disabled = true;
            if(imageUploadButton) imageUploadButton.disabled = true;
            if(recordAudioButton) recordAudioButton.disabled = true;
        }
    });
    console.log("Group select change listener attached.");
}

// Send text messages
if(sendButton && messageInput && database) {
    sendButton.addEventListener('click', () => {
        console.log("Send button clicked!");
        const text = messageInput.value.trim();
        if (text && currentUser && currentUser.userId && currentGroupId) {
            const groupMessagesRef = database.ref('groupMessages').child(currentGroupId);
            const newMessage = {
                type: 'text',
                senderName: currentUser.name,
                senderId: currentUser.userId,
                text: text,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            console.log("Sending text message:", newMessage, "to group:", currentGroupId);
            groupMessagesRef.push(newMessage)
                .then(() => {
                    console.log("Text message sent successfully.");
                    messageInput.value = '';
                })
                .catch(error => {
                    console.error("Error sending text message:", error);
                });
        } else {
            console.warn("Send click ignored: Text empty, user not logged in, or no group selected.");
        }
    });
    console.log("Event listener attached to send button.");
}

// Send on Enter key
if(messageInput && sendButton) {
    messageInput.addEventListener('keypress', (event) => {
        console.log("Key pressed in message input:", event.key);
        if (event.key === 'Enter') {
            event.preventDefault();
            sendButton.click();
        }
    });
    console.log("Event listener attached to message input (keypress).");
}

// Image upload
if(imageUploadButton && imageUploadInput) {
    imageUploadButton.addEventListener('click', () => {
        console.log("Image upload button clicked.");
        imageUploadInput.click();
    });
    console.log("Event listener attached to image upload button.");
}

if(imageUploadInput && storage && database) {
    imageUploadInput.addEventListener('change', async (event) => {
        console.log("Image upload input change event fired.");
        const files = event.target.files;
        
        if (!files || files.length === 0 || !currentUser || !currentUser.userId || !currentGroupId || !storageRef) {
            console.warn("Image upload ignored: No files, user not logged in, no group selected, or storageRef not ready.");
            event.target.value = null;
            return;
        }

        // Max 10 images
        const filesToUpload = Array.from(files).slice(0, 10);
        
        if (filesToUpload.length === 1) {
            // Upload single image
            const file = filesToUpload[0];
            console.log("File selected:", file.name);
            const fileName = `${Date.now()}_${file.name}`;
            const imageFileRef = storageRef.child(`${currentUser.userId}/${fileName}`);

            console.log("Starting image upload to:", imageFileRef.fullPath);
            const uploadTask = imageFileRef.put(file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload is ' + progress.toFixed(2) + '% done');
                },
                (error) => {
                    console.error("Image upload failed:", error);
                },
                () => {
                    console.log("Image upload complete. Getting download URL...");
                    uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                        console.log('File available at', downloadURL);

                        const groupMessagesRef = database.ref('groupMessages').child(currentGroupId);
                        const newMessage = {
                            type: 'image',
                            senderName: currentUser.name,
                            senderId: currentUser.userId,
                            imageUrl: downloadURL,
                            timestamp: firebase.database.ServerValue.TIMESTAMP
                        };
                        console.log("Sending image message:", newMessage, "to group:", currentGroupId);
                        groupMessagesRef.push(newMessage)
                            .then(() => {
                                console.log("Image message sent successfully.");
                            })
                            .catch(error => {
                                console.error("Error sending image message:", error);
                            });
                    });
                }
            );
        } else {
            // Upload multiple images (2-10)
            const uploadPromises = filesToUpload.map(file => {
                const fileName = `${Date.now()}_${file.name}`;
                const imageFileRef = storageRef.child(`${currentUser.userId}/${fileName}`);
                return imageFileRef.put(file).then(snapshot => snapshot.ref.getDownloadURL());
            });

            try {
                const imageUrls = await Promise.all(uploadPromises);
                console.log("All images uploaded:", imageUrls);

                const groupMessagesRef = database.ref('groupMessages').child(currentGroupId);
                const newMessage = {
                    type: 'image-group',
                    senderName: currentUser.name,
                    senderId: currentUser.userId,
                    images: imageUrls,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };
                
                groupMessagesRef.push(newMessage)
                    .then(() => {
                        console.log("Image group message sent successfully.");
                    })
                    .catch(error => {
                        console.error("Error sending image group message:", error);
                    });
            } catch (error) {
                console.error("Error uploading multiple images:", error);
            }
        }
        
        event.target.value = null;
    });
    console.log("Event listener attached to image upload input.");
}

// ===== Audio Recording Event Handlers =====

// Start recording on press (modified version)
recordAudioButton.addEventListener('mousedown', async (e) => {
    if (isRecording) return;
    startY = e.clientY;
    
    // Check permission first
    const hasPermission = await requestMicrophonePermission();
    
    if (hasPermission) {
        startRecording();
    } else {
        showMicrophonePermissionError();
    }
});

recordAudioButton.addEventListener('touchstart', async (e) => {
    if (isRecording) return;
    startY = e.touches[0].clientY;
    
    // Check permission first
    const hasPermission = await requestMicrophonePermission();
    
    if (hasPermission) {
        startRecording();
        e.preventDefault();
    } else {
        showMicrophonePermissionError();
    }
});

// Stop recording on release
recordAudioButton.addEventListener('mouseup', () => {
    if (!isRecording || isLocked) return;
    stopRecording();
});

recordAudioButton.addEventListener('touchend', (e) => {
    if (!isRecording || isLocked) return;
    stopRecording();
    e.preventDefault();
});

// Cancel recording on swipe up
recordAudioButton.addEventListener('mousemove', (e) => {
    if (!isRecording || isLocked) return;
    currentY = e.clientY;
    
    if (startY - currentY > 50) {
        cancelRecording();
    }
});

recordAudioButton.addEventListener('touchmove', (e) => {
    if (!isRecording || isLocked) return;
    currentY = e.touches[0].clientY;
    
    if (startY - currentY > 50) {
        cancelRecording();
    }
    e.preventDefault();
});

// Stop recording button
stopRecordingButton.addEventListener('click', () => {
    stopRecording();
});

// Cancel recording button
cancelRecordingButton.addEventListener('click', () => {
    cancelRecording();
});

// Retry button on error (modified version)
retryRecordingButton.addEventListener('click', async () => {
    recordingError.style.display = 'none';
    
    // Check permission first
    const hasPermission = await requestMicrophonePermission();
    
    if (hasPermission) {
        startRecording();
    } else {
        showMicrophonePermissionError();
    }
});

// Lock/unlock recording button
lockScreenButton.addEventListener('click', () => {
    unlockRecording();
});

// Confirm send recording button
confirmButton.addEventListener('click', () => {
    recordingConfirmation.style.display = 'none';
    const audioBlob = new Blob(audioChunks, { type: `audio/${recordingFormat}` });
    sendAudioMessage(audioBlob);
});

// Cancel send recording button
cancelButton.addEventListener('click', () => {
    recordingConfirmation.style.display = 'none';
});

// Send button from recording preview
sendPreviewButton.addEventListener('click', () => {
    recordingPreview.style.display = 'none';
    const audioBlob = new Blob(audioChunks, { type: `audio/${recordingFormat}` });
    sendAudioMessage(audioBlob);
});

// Retry button from recording preview
retryPreviewButton.addEventListener('click', () => {
    recordingPreview.style.display = 'none';
    startRecording();
});

// Got it button from tutorial
gotItButton.addEventListener('click', () => {
    tutorialStep.style.display = 'none';
});

// ===== Other Event Handlers =====

if(scrollToBottomButton) {
    scrollToBottomButton.addEventListener('click', () => {
        console.log("Scroll to bottom button clicked.");
        scrollToBottom();
    });
    console.log("Event listener attached to scroll to bottom button.");
}

if(messageArea && imageModal && modalCloseButton && modalDownloadButton && modalImage) {
    messageArea.addEventListener('click', (event) => {
        console.log("Message area clicked.", event.target);
        if (event.target.classList.contains('message-image')) {
            console.log("Clicked element is a message image.");
            const imageUrl = event.target.dataset.imageUrl;
            if (imageUrl) {
                console.log("Showing image modal for URL:", imageUrl);
                modalImage.src = imageUrl;
                imageModal.style.display = 'flex';
                modalDownloadButton.dataset.imageUrl = imageUrl;
            }
        }
    });
    console.log("Event listener attached to message area for image clicks.");

    modalCloseButton.addEventListener('click', () => {
        console.log("Modal close button clicked.");
        imageModal.style.display = 'none';
        modalImage.src = '';
        modalImage.style.transform = 'scale(1)';
        modalImage.style.left = '0px';
        modalImage.style.top = '0px';
        isPinching = false;
        initialX = initialY = initialDistance = 0;
        currentScale = 1;
    });
    console.log("Event listener attached to modal close button.");

    imageModal.addEventListener('click', (event) => {
        console.log("Image modal background clicked.", event.target);
        if (event.target === imageModal) {
            console.log("Clicked on modal background, closing modal.");
            modalCloseButton.click();
        }
    });
    console.log("Event listener attached to modal background for closing.");

    modalDownloadButton.addEventListener('click', () => {
        console.log("Modal download button clicked.");
        const imageUrl = modalDownloadButton.dataset.imageUrl;
        if (imageUrl) {
            console.log("Attempting to download image from URL:", imageUrl);
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = 'chat_image_' + new Date().getTime();
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log("Download link created and clicked.");
        } else {
            console.warn("Download button clicked but no image URL found.");
        }
    });
    console.log("Event listener attached to modal download button.");

    console.log("Touch event listeners for image modal attached.");
    modalImage.addEventListener('touchstart', (event) => {
        if (event.touches.length === 2) {
            isPinching = true;
            initialDistance = Math.hypot(event.touches[1].clientX - event.touches[0].clientX, event.touches[1].clientY - event.touches[0].clientY);
            currentScale = parseFloat(modalImage.style.transform.replace('scale(', '').replace(')', '')) || 1;
            event.preventDefault();
        } else if (event.touches.length === 1 && currentScale > 1) {
            initialX = event.touches[0].clientX - (parseFloat(modalImage.style.left) || 0);
            initialY = event.touches[0].clientY - (parseFloat(modalImage.style.top) || 0);
            modalImage.classList.add('dragging');
            event.preventDefault();
        }
    }, { passive: false });

    modalImage.addEventListener('touchmove', (event) => {
        if (isPinching && event.touches.length === 2) {
            event.preventDefault();
            const currentDistance = Math.hypot(event.touches[1].clientX - event.touches[0].clientX, event.touches[1].clientY - event.touches[0].clientY);
            const scale = currentScale * (currentDistance / initialDistance);
            modalImage.style.transform = `scale(${Math.min(Math.max(scale, 0.5), 4)})`;
        } else if (event.touches.length === 1 && modalImage.classList.contains('dragging')) {
            event.preventDefault();
            const newX = event.touches[0].clientX - initialX;
            const newY = event.touches[0].clientY - initialY;
            modalImage.style.left = `${newX}px`;
            modalImage.style.top = `${newY}px`;
        }
    }, { passive: false });

    modalImage.addEventListener('touchend', (event) => {
        if (event.touches.length < 2) isPinching = false;
        if (event.touches.length < 1) modalImage.classList.remove('dragging');
    });
} else {
    console.error("Critical image modal elements not found. Image preview/download will not work.");
}

if (userListToggleButton && chatContainer && userList) {
    userListToggleButton.addEventListener('click', () => {
        console.log("User list toggle button clicked.");
        const isVisible = chatContainer.classList.toggle('user-list-visible');
        userList.style.display = isVisible ? 'block' : 'none';
    });
    console.log("Event listener attached to user list toggle button.");

    if (window.innerWidth <= 768) {
        document.addEventListener('click', (event) => {
            if (window.innerWidth <= 768) {
                const isClickInsideUserList = userList && userList.contains(event.target);
                const isClickOnToggleButton = userListToggleButton && userListToggleButton.contains(event.target);
                const isListVisible = chatContainer && chatContainer.classList.contains('user-list-visible');

                if (isListVisible && !isClickInsideUserList && !isClickOnToggleButton) {
                    console.log("Clicked outside user list/toggle button on mobile, closing.");
                    userListToggleButton.click();
                }
            }
        });
        console.log("Global click listener attached for closing user list on mobile.");
    }
} else {
    console.error("User list toggle button or chat/user list containers not found.");
}

// ===== Initial Setup =====

if(loginContainer && chatContainer) {
    showLogin();
    console.log("Showing login screen.");
} else {
    console.error("Login or chat containers not found. Cannot show initial screen.");
}

window.addEventListener('resize', () => {
    console.log("Window resized. Checking layout...");
    const isSmallScreen = window.innerWidth <= 768;
    if(userListToggleButton) userListToggleButton.style.display = isSmallScreen ? 'block' : 'none';

    if (isSmallScreen) {
        if (userList) {
            if (!chatContainer || !chatContainer.classList.contains('user-list-visible')) {
                userList.style.display = 'none';
            } else {
                userList.style.display = 'block';
            }
        }
    } else {
        if(userList) userList.style.display = 'block';
        if(chatContainer) chatContainer.classList.remove('user-list-visible');
    }
});
window.dispatchEvent(new Event('resize'));
console.log("Resize listener attached and triggered.");

window.addEventListener('beforeunload', () => {
    console.log("Window beforeunload event triggered.");
    if (currentUser && currentUserId && onlineUsersRef && database.app.options) {
        // Clean up if needed
    }
});
console.log("beforeunload listener attached.");

console.log("Chat script fully executed.");