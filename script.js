// ===================================================================================
// === 1. CONFIGURATION
// ===================================================================================
const SUPABASE_URL = 'https://ranvcpqfcynzblfhnaer.supabase.co'; // Your Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbnZjcHFmY3luemJsZmhuYWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NTc4OTQsImV4cCI6MjA2NzAzMzg5NH0.j2Cxny4EYW4_NzE4AYyi597CwCgZAF5VTqyslJNU5UI'; // Your Supabase Anon Key
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===================================================================================
// === 2. ELEMENT SELECTORS
// ===================================================================================
const presentationTitle = document.getElementById('presentation-title');
const pptList = document.getElementById('ppt-list');
const uploadForm = document.getElementById('upload-form');
const uploaderNameInput = document.getElementById('uploader-name');
const pptFileInput = document.getElementById('ppt-file');
const uploadStatus = document.getElementById('upload-status');
const viewerContainer = document.getElementById('viewer-container');
const menuButton = document.getElementById('menu-button');
const dropdownMenu = document.getElementById('dropdown-menu');
const uploadButton = document.getElementById('upload-button'); // New Upload button in header
const uploadModal = document.getElementById('upload-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const carouselCounter = document.getElementById('carousel-counter');

// ===================================================================================
// === 3. STATE MANAGEMENT
// ===================================================================================
let allPresentations = [];
let currentIndex = -1;

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

    // If there was a presentation selected, try to keep it selected.
    const lastViewedIndex = currentIndex;
    currentIndex = allPresentations.length > 0 ? (lastViewedIndex >= 0 && lastViewedIndex < allPresentations.length ? lastViewedIndex : 0) : -1;
    
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
        // Add a data-id to the main li element for easy access
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
    presentationTitle.textContent = currentPres.file_name; // Update header title
    carouselCounter.textContent = `${currentIndex + 1} of ${allPresentations.length}`;

    prevBtn.disabled = (currentIndex === 0);
    nextBtn.disabled = (currentIndex === allPresentations.length - 1);
}

function displayViewer(filePath) {
    const { data } = supabase.storage.from('ppts').getPublicUrl(filePath);
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(data.publicUrl)}`;
    viewerContainer.innerHTML = `<iframe id="viewer-iframe" src="${viewerUrl}" frameborder="0"></iframe>`;
}

// --- NEW CRUD (Create, Read, Update, Delete) Functions ---

async function handleEdit(id, currentName) {
    const newName = prompt("Enter the new name for the uploader:", currentName);
    if (newName && newName.trim() !== "") {
        const { error } = await supabase.from('presentations').update({ uploader_name: newName.trim() }).eq('id', id);
        if (error) {
            alert("Failed to update name: " + error.message);
        } else {
            fetchAndInitialize(); // Refresh everything
        }
    }
}

async function handleDelete(id, filePath) {
    const isConfirmed = confirm(`Are you sure you want to delete this presentation? This action cannot be undone.`);
    if (isConfirmed) {
        // Step 1: Delete the file from Storage
        const { error: storageError } = await supabase.storage.from('ppts').remove([filePath]);
        if (storageError) {
            alert("Failed to delete file from storage: " + storageError.message);
            return; // Stop if the file can't be deleted
        }

        // Step 2: Delete the record from the database
        const { error: dbError } = await supabase.from('presentations').delete().eq('id', id);
        if (dbError) {
            alert("File was deleted from storage, but failed to delete database record: " + dbError.message);
        } else {
            // If the deleted item was the one being viewed, reset the view
            currentIndex = -1;
            fetchAndInitialize();
        }
    }
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
        }, 1500);
        fetchAndInitialize();
    } catch (error) {
        console.error('Upload failed:', error);
        uploadStatus.textContent = `Upload failed: ${error.message}`;
    }
}

// ===================================================================================
// === 5. EVENT LISTENERS
// ===================================================================================

// Carousel navigation
prevBtn.addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; updateCarouselView(); } });
nextBtn.addEventListener('click', () => { if (currentIndex < allPresentations.length - 1) { currentIndex++; updateCarouselView(); } });

// Dropdown menu
menuButton.addEventListener('click', () => dropdownMenu.classList.toggle('show'));
window.addEventListener('click', (event) => {
    if (!menuButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
        dropdownMenu.classList.remove('show');
    }
});

// *** NEW: Event Delegation for list items (view, edit, delete) ***
pptList.addEventListener('click', (event) => {
    const listItem = event.target.closest('.ppt-list-item');
    if (!listItem) return; // Didn't click inside a list item

    const presId = listItem.dataset.id;
    const presentation = allPresentations.find(p => p.id === presId);
    if (!presentation) return;

    if (event.target.closest('.delete-btn')) {
        handleDelete(presentation.id, presentation.file_path);
    } else if (event.target.closest('.edit-btn')) {
        handleEdit(presentation.id, presentation.uploader_name);
    } else {
        // Clicked on the item itself, not a button -> view it
        currentIndex = allPresentations.findIndex(p => p.id === presId);
        updateCarouselView();
        dropdownMenu.classList.remove('show');
    }
});

// Modal controls
uploadButton.addEventListener('click', () => uploadModal.classList.remove('hidden'));
closeModalBtn.addEventListener('click', () => uploadModal.classList.add('hidden'));
uploadModal.addEventListener('click', (event) => {
    if (event.target === uploadModal) uploadModal.classList.add('hidden');
});

// Form submission
uploadForm.addEventListener('submit', handleUpload);

// ===================================================================================
// === 6. INITIALIZATION
// ===================================================================================
fetchAndInitialize();
