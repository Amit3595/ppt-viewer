// ===================================================================================
// === 1. CONFIGURATION
// ===================================================================================
const SUPABASE_URL = 'https://twgslkjjhsjmagvprcip.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3Z3Nsa2pqaHNqbWFndnByY2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0ODIwNjQsImV4cCI6MjA2NzA1ODA2NH0.l0ylH1mQrpTSqCRNcYUvOsqRtwPnLkS6XHOLen__e1Y';
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

// Modal Elements
const allModals = document.querySelectorAll('.modal-overlay');
const uploadModal = document.getElementById('upload-modal');
const editNameModal = document.getElementById('edit-name-modal');
const deleteConfirmModal = document.getElementById('delete-confirm-modal');

// --- Upload Modal ---
const uploadButton = document.getElementById('upload-button');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelUploadBtn = document.getElementById('cancel-upload-btn');
const uploadForm = document.getElementById('upload-form');
const uploaderNameInput = document.getElementById('uploader-name');
const pptFileInput = document.getElementById('ppt-file');
const uploadStatus = document.getElementById('upload-status');
const dropZone = document.getElementById('drop-zone');
const dropZoneText = document.getElementById('drop-zone-text');

// --- Edit Modal ---
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editForm = document.getElementById('edit-form');
const editUploaderNameInput = document.getElementById('edit-uploader-name');
const editStatus = document.getElementById('edit-status');

// --- Delete Modal ---
const closeDeleteModalBtn = document.getElementById('close-delete-modal-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const deleteConfirmMessage = document.getElementById('delete-confirm-message');

// ===================================================================================
// === 3. STATE MANAGEMENT
// ===================================================================================
let allPresentations = [];
let currentIndex = -1;
let activePresentation = { id: null, filePath: null, uploaderName: null };

// ===================================================================================
// === 4. CORE & HELPER FUNCTIONS
// ===================================================================================

function showModal(modal) {
    if (modal === uploadModal) {
        uploadForm.reset();
        dropZoneText.textContent = 'Drag & Drop File Here';
        uploadStatus.textContent = '';
    }
    modal.classList.add('visible');
}
function hideModal(modal) { modal.classList.remove('visible'); }
function hideAllModals() { allModals.forEach(hideModal); }

function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
        case 'pdf':    return '📄';
        case 'doc': case 'docx':   return '📘';
        case 'xls': case 'xlsx':   return '📊';
        case 'ppt': case 'pptx':   return '📙';
        default:       return '📁';
    }
}

async function fetchAndInitialize() {
    viewerContainer.innerHTML = '<div class="welcome-message"><p>Loading files...</p></div>';
    const { data, error } = await supabase.from('presentations').select('*').order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching files:', error);
        viewerContainer.innerHTML = '<div class="welcome-message"><p>Failed to load data.</p></div>';
        return;
    }

    allPresentations = data;
    displayPresentationsInDropdown(allPresentations);

    const lastViewedId = allPresentations[currentIndex]?.id;
    const newIndex = allPresentations.findIndex(p => p.id === lastViewedId);
    currentIndex = (newIndex !== -1) ? newIndex : (allPresentations.length > 0 ? 0 : -1);
    updateCarouselView();
}

function displayPresentationsInDropdown(presentations) {
    pptList.innerHTML = '';
    if (presentations.length === 0) {
        pptList.innerHTML = '<li style="padding: 12px 16px; color: var(--text-secondary); text-align: center;">No files found.</li>';
        return;
    }
    presentations.forEach((pres) => {
        const li = document.createElement('li');
        li.classList.add('ppt-list-item');
        li.dataset.id = pres.id;
        const icon = getFileIcon(pres.file_name);
        li.innerHTML = `
            <div class="ppt-info">
                <div class="ppt-name">${icon} ${pres.file_name}</div>
                <div class="ppt-uploader">by ${pres.uploader_name}</div>
            </div>
            <div class="item-actions">
                <button class="action-btn download-btn" title="Download File">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                        <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                    </svg>
                </button>
                <button class="action-btn edit-btn" title="Edit Name">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                    </svg>
                </button>
                <button class="action-btn delete-btn" title="Delete File">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 10.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1H8.75zM10 4.5a.75.75 0 01.75.75v8.5a.75.75 0 01-1.5 0v-8.5A.75.75 0 0110 4.5zM7.5 6a.75.75 0 00-1.5 0v5a.75.75 0 001.5 0v-5zm5 0a.75.75 0 00-1.5 0v5a.75.75 0 001.5 0v-5z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        `;
        pptList.appendChild(li);
    });
}

function updateCarouselView() {
    if (currentIndex === -1 || allPresentations.length === 0) {
        viewerContainer.innerHTML = `<div id="welcome-message" class="welcome-message"><h2>Document Viewer</h2><p>Select a file from the menu to get started.</p></div>`;
        presentationTitle.textContent = 'Document Viewer';
        carouselCounter.textContent = 'No files loaded';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }
    const currentPres = allPresentations[currentIndex];
    displayViewer(currentPres.file_path);
    presentationTitle.innerHTML = `${getFileIcon(currentPres.file_name)} ${currentPres.file_name}`;
    carouselCounter.textContent = `${currentIndex + 1} of ${allPresentations.length}`;
    prevBtn.disabled = (currentIndex === 0);
    nextBtn.disabled = (currentIndex === allPresentations.length - 1);
}

function displayViewer(filePath) {
    const extension = filePath.split('.').pop().toLowerCase();
    const { data } = supabase.storage.from('ppts').getPublicUrl(filePath);
    const publicUrl = data.publicUrl;
    let viewerUrl;
    if (extension === 'pdf') {
        viewerUrl = publicUrl;
    } else {
        viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}`;
    }
    viewerContainer.innerHTML = `<iframe id="viewer-iframe" src="${viewerUrl}" frameborder="0"></iframe>`;
}

async function handleListItemDownload(presentation, buttonElement) {
    buttonElement.disabled = true;
    try {
        const { data: blob, error } = await supabase.storage.from('ppts').download(presentation.file_path);
        if (error) throw error;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = presentation.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error('Error downloading file:', error);
        alert('Failed to download file. Please try again.');
    } finally {
        buttonElement.disabled = false;
    }
}

function handleEdit(presentation) {
    activePresentation = { id: presentation.id, uploaderName: presentation.uploader_name };
    editUploaderNameInput.value = presentation.uploader_name;
    editStatus.textContent = '';
    showModal(editNameModal);
}

function handleDelete(presentation) {
    activePresentation = { id: presentation.id, filePath: presentation.file_path };
    deleteConfirmMessage.innerHTML = `Are you sure you want to delete <strong>"${presentation.file_name}"</strong>? This action cannot be undone.`;
    showModal(deleteConfirmModal);
}

async function performEdit(event) {
    event.preventDefault();
    const newName = editUploaderNameInput.value.trim();
    if (!newName) {
        editStatus.textContent = 'Name cannot be empty.';
        return;
    }
    if (newName === activePresentation.uploaderName) {
        hideModal(editNameModal);
        return;
    }
    editStatus.textContent = 'Saving...';
    const { error } = await supabase.from('presentations').update({ uploader_name: newName }).eq('id', activePresentation.id);
    if (error) {
        editStatus.textContent = "Failed to update: " + error.message;
    } else {
        editStatus.textContent = 'Saved!';
        setTimeout(() => {
            hideModal(editNameModal);
            fetchAndInitialize();
        }, 1000);
    }
}

async function performDelete() {
    hideModal(deleteConfirmModal);
    const { id, filePath } = activePresentation;
    const deletedIndex = allPresentations.findIndex(p => p.id === id);
    if (deletedIndex !== -1) {
        allPresentations.splice(deletedIndex, 1);
        displayPresentationsInDropdown(allPresentations);
        if (currentIndex >= deletedIndex) {
           currentIndex = Math.max(0, currentIndex - 1);
        }
        if(allPresentations.length === 0) currentIndex = -1;
        updateCarouselView();
    }
    const { error: storageError } = await supabase.storage.from('ppts').remove([filePath]);
    if (storageError) alert("Failed to delete file from storage: " + storageError.message);
    const { error: dbError } = await supabase.from('presentations').delete().eq('id', id);
    if (dbError) alert("File was deleted from storage, but DB record deletion failed: " + dbError.message);
    fetchAndInitialize(); 
}

async function handleUpload(event) {
    event.preventDefault();
    const uploaderName = uploaderNameInput.value.trim();
    const file = pptFileInput.files[0];
    if (!uploaderName || !file) {
        uploadStatus.textContent = 'Please provide your name and a file.';
        return;
    }
    uploadStatus.textContent = 'Uploading... Please wait.';
    try {
        const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('ppts').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { error: insertError } = await supabase.from('presentations').insert([{ uploader_name: uploaderName, file_name: file.name, file_path: fileName }]);
        if (insertError) throw insertError;
        uploadStatus.textContent = 'Upload successful!';
        setTimeout(() => {
            hideModal(uploadModal);
            currentIndex = 0;
            fetchAndInitialize();
        }, 1500);
    } catch (error) {
        console.error('Upload failed:', error);
        uploadStatus.textContent = `Upload failed: ${error.message}`;
    }
}

// ===================================================================================
// === 5. EVENT LISTENERS
// ===================================================================================
prevBtn.addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; updateCarouselView(); }});
nextBtn.addEventListener('click', () => { if (currentIndex < allPresentations.length - 1) { currentIndex++; updateCarouselView(); }});
menuButton.addEventListener('click', (e) => { e.stopPropagation(); dropdownMenu.classList.toggle('show'); });
document.addEventListener('click', () => dropdownMenu.classList.remove('show'));

pptList.addEventListener('click', (event) => {
    const listItem = event.target.closest('.ppt-list-item');
    if (!listItem) return;
    event.stopPropagation();
    const presId = listItem.dataset.id;
    const presentation = allPresentations.find(p => p.id === presId);
    if (!presentation) return;
    if (event.target.closest('.download-btn')) handleListItemDownload(presentation, event.target.closest('.download-btn'));
    else if (event.target.closest('.edit-btn')) handleEdit(presentation);
    else if (event.target.closest('.delete-btn')) handleDelete(presentation);
    else {
        currentIndex = allPresentations.findIndex(p => p.id === presId);
        updateCarouselView();
        dropdownMenu.classList.remove('show');
    }
});

// --- Upload Modal & Drag-Drop Listeners ---
uploadButton.addEventListener('click', () => showModal(uploadModal));
closeModalBtn.addEventListener('click', () => hideModal(uploadModal));
cancelUploadBtn.addEventListener('click', () => hideModal(uploadModal));
uploadForm.addEventListener('submit', handleUpload);

dropZone.addEventListener('click', () => pptFileInput.click());
pptFileInput.addEventListener('change', () => {
    if (pptFileInput.files.length > 0) {
        dropZoneText.textContent = pptFileInput.files[0].name;
    }
});
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        pptFileInput.files = e.dataTransfer.files;
        dropZoneText.textContent = e.dataTransfer.files[0].name;
    }
});
// --- End Upload Listeners ---

editForm.addEventListener('submit', performEdit);
closeEditModalBtn.addEventListener('click', () => hideModal(editNameModal));
cancelEditBtn.addEventListener('click', () => hideModal(editNameModal));

confirmDeleteBtn.addEventListener('click', performDelete);
closeDeleteModalBtn.addEventListener('click', () => hideModal(deleteConfirmModal));
cancelDeleteBtn.addEventListener('click', () => hideModal(deleteConfirmModal));

allModals.forEach(modal => {
    modal.addEventListener('click', (event) => { if (event.target === modal) hideAllModals(); });
});
document.addEventListener('keydown', (e) => { if (e.key === "Escape") hideAllModals(); });

// ===================================================================================
// === 6. INITIALIZATION
// ===================================================================================
fetchAndInitialize();
hideAllModals();