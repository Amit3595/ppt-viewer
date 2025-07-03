// ===================================================================================
// === 1. CONFIGURATION
// ===================================================================================
const SUPABASE_URL = 'https://twgslkjjhsjmagvprcip.supabase.co'; // Your Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3Z3Nsa2pqaHNqbWFndnByY2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0ODIwNjQsImV4cCI6MjA2NzA1ODA2NH0.l0ylH1mQrpTSqCRNcYUvOsqRtwPnLkS6XHOLen__e1Y'; // Your Supabase Anon Key
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===================================================================================
// === 2. ELEMENT SELECTORS
// ===================================================================================
const presentationTitle = document.getElementById('presentation-title');
const pptList = document.getElementById('ppt-list');
const viewerContainer = document.getElementById('viewer-container');
const menuButton = document.getElementById('menu-button');
const dropdownMenu = document.getElementById('dropdown-menu');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const carouselCounter = document.getElementById('carousel-counter');

// --- Upload Modal Elements ---
const uploadButton = document.getElementById('upload-button');
const uploadModal = document.getElementById('upload-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const uploadForm = document.getElementById('upload-form');
const uploaderNameInput = document.getElementById('uploader-name');
const pptFileInput = document.getElementById('ppt-file');
const uploadStatus = document.getElementById('upload-status');

// --- NEW: Edit Modal Elements ---
const editNameModal = document.getElementById('edit-name-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editForm = document.getElementById('edit-form');
const editUploaderNameInput = document.getElementById('edit-uploader-name');
const editStatus = document.getElementById('edit-status');

// --- NEW: Delete Modal Elements ---
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const closeDeleteModalBtn = document.getElementById('close-delete-modal-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const deleteConfirmMessage = document.getElementById('delete-confirm-message');


// ===================================================================================
// === 3. STATE MANAGEMENT
// ===================================================================================
let allPresentations = [];
let currentIndex = -1;
// NEW: State for modals to know which item is being acted upon
let activePresentation = { id: null, filePath: null, uploaderName: null };

// ===================================================================================
// === 4. CORE FUNCTIONS
// ===================================================================================

async function fetchAndInitialize() {
    viewerContainer.innerHTML = '<div class="welcome-message"><p>Loading presentations...</p></div>';
    const { data, error } = await supabase.from('presentations').select('*').order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching presentations:', error);
        viewerContainer.innerHTML = '<div class="welcome-message"><p>Failed to load data.</p></div>';
        return;
    }

    allPresentations = data;
    displayPresentationsInDropdown(allPresentations);

    const lastViewedId = allPresentations[currentIndex]?.id;
    const newIndex = allPresentations.findIndex(p => p.id === lastViewedId);

    if (newIndex !== -1) {
        currentIndex = newIndex;
    } else {
        currentIndex = allPresentations.length > 0 ? 0 : -1;
    }

    updateCarouselView();
}

function displayPresentationsInDropdown(presentations) {
    pptList.innerHTML = '';
    if (presentations.length === 0) {
        pptList.innerHTML = '<li class="dropdown-item" style="cursor:default; color:var(--text-muted);">No presentations found.</li>';
        return;
    }
    presentations.forEach((pres) => {
        const li = document.createElement('li');
        li.classList.add('ppt-list-item');
        // IMPORTANT: We use the actual database ID now
        li.dataset.id = pres.id;

        li.innerHTML = `
            <div class="ppt-info">
                <div class="ppt-name">${pres.file_name}</div>
                <div class="ppt-uploader">by ${pres.uploader_name}</div>
            </div>
            <div class="item-actions">
                <button class="action-btn edit-btn" title="Edit Name">✎</button>
                <button class="action-btn delete-btn" title="Delete Presentation">🗑️</button>
            </div>
        `;
        pptList.appendChild(li);
    });
}

function updateCarouselView() {
    if (currentIndex === -1 || allPresentations.length === 0) {
        viewerContainer.innerHTML = `<div id="welcome-message" class="welcome-message"><h2>PPT Viewer</h2><p>Select a presentation from the menu to get started or upload a new one.</p></div>`;
        presentationTitle.textContent = 'PPT Viewer';
        carouselCounter.textContent = 'No presentations loaded';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    const currentPres = allPresentations[currentIndex];
    displayViewer(currentPres.file_path);
    presentationTitle.textContent = currentPres.file_name;
    carouselCounter.textContent = `${currentIndex + 1} of ${allPresentations.length}`;

    prevBtn.disabled = (currentIndex === 0);
    nextBtn.disabled = (currentIndex === allPresentations.length - 1);
}

function displayViewer(filePath) {
    const { data } = supabase.storage.from('ppts').getPublicUrl(filePath);
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(data.publicUrl)}`;
    viewerContainer.innerHTML = `<iframe id="viewer-iframe" src="${viewerUrl}" frameborder="0"></iframe>`;
}

// --- REFACTORED: Edit and Delete Handlers ---

// This function now just OPENS the modal
function handleEdit(presentation) {
    // Store the presentation info in our state object
    activePresentation = { id: presentation.id, uploaderName: presentation.uploader_name };
    // Pre-fill the input with the current name
    editUploaderNameInput.value = presentation.uploader_name;
    editStatus.textContent = ''; // Clear any previous status messages
    // Show the modal
    editNameModal.classList.remove('hidden');
}

// This function now just OPENS the modal
function handleDelete(presentation) {
    // Store the presentation info in our state object
    activePresentation = { id: presentation.id, filePath: presentation.file_path };
    // Update the message to be specific
    deleteConfirmMessage.textContent = `Are you sure you want to delete "${presentation.file_name}"? This action cannot be undone.`;
    // Show the modal
    deleteConfirmModal.classList.remove('hidden');
}

// --- NEW: Functions to perform the actual work, called by modal buttons ---

async function performEdit(event) {
    event.preventDefault();
    const newName = editUploaderNameInput.value.trim();

    if (newName && newName !== activePresentation.uploaderName) {
        editStatus.textContent = 'Saving...';
        const { error } = await supabase.from('presentations').update({ uploader_name: newName }).eq('id', activePresentation.id);
        
        if (error) {
            editStatus.textContent = "Failed to update name: " + error.message;
        } else {
            editStatus.textContent = 'Saved!';
            setTimeout(() => {
                editNameModal.classList.add('hidden');
                fetchAndInitialize(); // Re-fetch to show updated data
            }, 1000);
        }
    } else if (newName === activePresentation.uploaderName) {
        // No changes were made, just close the modal
        editNameModal.classList.add('hidden');
    } else {
        editStatus.textContent = 'Name cannot be empty.';
    }
}

async function performDelete() {
    // Use the stored state
    const { id, filePath } = activePresentation;

    // First, delete the file from storage
    const { error: storageError } = await supabase.storage.from('ppts').remove([filePath]);
    if (storageError) {
        alert("Failed to delete file from storage: " + storageError.message);
        deleteConfirmModal.classList.add('hidden'); // Close modal on failure
        return;
    }

    // Then, delete the record from the database
    const { error: dbError } = await supabase.from('presentations').delete().eq('id', id);
    if (dbError) {
        // This is a tricky state, but we should inform the user.
        alert("File was deleted from storage, but failed to delete database record: " + dbError.message);
    }
    
    // Close the modal and refresh the list
    deleteConfirmModal.classList.add('hidden');
    // If the deleted item was the one being viewed, reset the index
    if (allPresentations[currentIndex]?.id === id) {
        currentIndex = -1;
    }
    fetchAndInitialize(); 
}

async function handleUpload(event) {
    event.preventDefault();
    const uploaderName = uploaderNameInput.value.trim();
    const file = pptFileInput.files[0];
    if (!uploaderName || !file) {
        uploadStatus.textContent = 'Please fill in your name and choose a file.';
        return;
    }
    uploadStatus.textContent = 'Uploading... Please wait.';
    try {
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('ppts').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase.from('presentations').insert([{ uploader_name: uploaderName, file_name: file.name, file_path: fileName }]);
        if (insertError) throw insertError;

        uploadStatus.textContent = 'Upload successful!';
        setTimeout(() => {
            uploadModal.classList.add('hidden');
            uploadForm.reset();
            uploadStatus.textContent = '';
            fetchAndInitialize(); // Re-fetch data after successful upload
        }, 1500);
    } catch (error) {
        console.error('Upload failed:', error);
        uploadStatus.textContent = `Upload failed: ${error.message}`;
    }
}

// ===================================================================================
// === 5. EVENT LISTENERS
// ===================================================================================

prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
        currentIndex--;
        updateCarouselView();
    }
});

nextBtn.addEventListener('click', () => {
    if (currentIndex < allPresentations.length - 1) {
        currentIndex++;
        updateCarouselView();
    }
});

menuButton.addEventListener('click', () => dropdownMenu.classList.toggle('show'));
window.addEventListener('click', (event) => {
    if (!menuButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
        dropdownMenu.classList.remove('show');
    }
});

pptList.addEventListener('click', (event) => {
    const listItem = event.target.closest('.ppt-list-item');
    if (!listItem) return;

    const presId = listItem.dataset.id;
    // Find the full presentation object by its database ID
    const presentation = allPresentations.find(p => p.id === presId);
    if (!presentation) return;

    if (event.target.closest('.delete-btn')) {
        handleDelete(presentation); // Pass the whole object
    } else if (event.target.closest('.edit-btn')) {
        handleEdit(presentation); // Pass the whole object
    } else {
        // Find the index of the clicked presentation
        currentIndex = allPresentations.findIndex(p => p.id === presId);
        updateCarouselView();
        dropdownMenu.classList.remove('show');
    }
});

// --- Upload Modal Listeners ---
uploadButton.addEventListener('click', () => uploadModal.classList.remove('hidden'));
closeModalBtn.addEventListener('click', () => uploadModal.classList.add('hidden'));
uploadModal.addEventListener('click', (event) => {
    if (event.target === uploadModal) uploadModal.classList.add('hidden');
});
uploadForm.addEventListener('submit', handleUpload);


// --- NEW: Edit Modal Listeners ---
editForm.addEventListener('submit', performEdit);
closeEditModalBtn.addEventListener('click', () => editNameModal.classList.add('hidden'));
cancelEditBtn.addEventListener('click', () => editNameModal.classList.add('hidden'));
editNameModal.addEventListener('click', (event) => {
    if (event.target === editNameModal) editNameModal.classList.add('hidden');
});

// --- NEW: Delete Modal Listeners ---
confirmDeleteBtn.addEventListener('click', performDelete);
closeDeleteModalBtn.addEventListener('click', () => deleteConfirmModal.classList.add('hidden'));
cancelDeleteBtn.addEventListener('click', () => deleteConfirmModal.classList.add('hidden'));
deleteConfirmModal.addEventListener('click', (event) => {
    if (event.target === deleteConfirmModal) deleteConfirmModal.classList.add('hidden');
});


// ===================================================================================
// === 6. INITIALIZATION
// ===================================================================================
fetchAndInitialize();