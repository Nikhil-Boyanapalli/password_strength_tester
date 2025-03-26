document.addEventListener('DOMContentLoaded', async function() {
  const siteList = document.getElementById('siteList');
  const searchBox = document.getElementById('searchBox');
  const sortSelect = document.getElementById('sortSelect');
  const addButton = document.getElementById('addButton');
  const confirmModal = document.getElementById('confirmModal');
  const confirmModalClose = document.getElementById('confirmModalClose');
  const confirmModalCancel = document.getElementById('confirmModalCancel');
  const confirmModalConfirm = document.getElementById('confirmModalConfirm');
  const addModal = document.getElementById('addModal');
  const addModalClose = document.getElementById('addModalClose');
  const addModalCancel = document.getElementById('addModalCancel');
  const addModalSave = document.getElementById('addModalSave');
  const newSiteInput = document.getElementById('newSiteInput');

  let currentSites = [];
  let siteToRemove = null;

  // Load and display trusted sites
  async function loadTrustedSites() {
    try {
      const result = await chrome.storage.local.get('trustedSites');
      const trustedSites = result.trustedSites || {};
      currentSites = Object.entries(trustedSites).map(([site, data]) => ({
        domain: site,
        dateAdded: data.dateAdded || Date.now()
      }));
      displaySites();
    } catch (error) {
      console.error('Error loading trusted sites:', error);
      siteList.innerHTML = '<div class="empty-state">Error loading trusted sites</div>';
    }
  }

  // Display sites with current search and sort
  function displaySites() {
    let filteredSites = [...currentSites];
    
    // Apply search filter
    const searchTerm = searchBox.value.toLowerCase();
    if (searchTerm) {
      filteredSites = filteredSites.filter(site => 
        site.domain.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    const [sortField, sortOrder] = sortSelect.value.split('-');
    filteredSites.sort((a, b) => {
      if (sortField === 'name') {
        return sortOrder === 'asc' 
          ? a.domain.localeCompare(b.domain)
          : b.domain.localeCompare(a.domain);
      } else {
        return sortOrder === 'asc'
          ? a.dateAdded - b.dateAdded
          : b.dateAdded - a.dateAdded;
      }
    });

    if (filteredSites.length === 0) {
      siteList.innerHTML = '<div class="empty-state">No matching sites found</div>';
      return;
    }

    siteList.innerHTML = filteredSites.map(site => `
      <div class="site-item">
        <span>${site.domain}</span>
        <button class="remove-button" data-site="${site.domain}">Remove</button>
      </div>
    `).join('');

    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-button').forEach(button => {
      button.addEventListener('click', () => {
        siteToRemove = button.dataset.site;
        confirmModal.style.display = 'flex';
      });
    });
  }

  // Remove a trusted site
  async function removeTrustedSite(site) {
    try {
      const result = await chrome.storage.local.get('trustedSites');
      const trustedSites = result.trustedSites || {};
      delete trustedSites[site];
      await chrome.storage.local.set({ trustedSites });
      await loadTrustedSites();
      confirmModal.style.display = 'none';
    } catch (error) {
      console.error('Error removing trusted site:', error);
    }
  }

  // Add a new trusted site
  async function addTrustedSite(site) {
    try {
      const result = await chrome.storage.local.get('trustedSites');
      const trustedSites = result.trustedSites || {};
      trustedSites[site] = {
        dateAdded: Date.now()
      };
      await chrome.storage.local.set({ trustedSites });
      await loadTrustedSites();
      addModal.style.display = 'none';
      newSiteInput.value = '';
    } catch (error) {
      console.error('Error adding trusted site:', error);
    }
  }

  // Event Listeners
  searchBox.addEventListener('input', displaySites);
  sortSelect.addEventListener('change', displaySites);
  
  // Add Site Modal
  addButton.addEventListener('click', () => {
    addModal.style.display = 'flex';
  });

  addModalClose.addEventListener('click', () => {
    addModal.style.display = 'none';
    newSiteInput.value = '';
  });

  addModalCancel.addEventListener('click', () => {
    addModal.style.display = 'none';
    newSiteInput.value = '';
  });

  addModalSave.addEventListener('click', () => {
    const site = newSiteInput.value.trim();
    if (site) {
      addTrustedSite(site);
    }
  });

  // Confirmation Modal
  confirmModalClose.addEventListener('click', () => {
    confirmModal.style.display = 'none';
    siteToRemove = null;
  });

  confirmModalCancel.addEventListener('click', () => {
    confirmModal.style.display = 'none';
    siteToRemove = null;
  });

  confirmModalConfirm.addEventListener('click', () => {
    if (siteToRemove) {
      removeTrustedSite(siteToRemove);
    }
  });

  // Initial load
  await loadTrustedSites();
}); 