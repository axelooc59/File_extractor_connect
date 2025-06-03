// Variables globales
let filesData = null;
let filesCount = 0;
let isScanning = false;
let scanDepth = 0;
let maxDepth = 5; // Profondeur maximale par défaut

// Éléments DOM
const scanBtn = document.getElementById('scanBtn');
const exportBtn = document.getElementById('exportBtn');
const filesCountEl = document.getElementById('filesCount');
const statusEl = document.getElementById('status');

// Checkboxes pour les colonnes
const colFilename = document.getElementById('col-filename');
const colAuthor = document.getElementById('col-author');
const colUrl= document.getElementById('col-url')
const colVersion = document.getElementById('col-version');
const colFilesize = document.getElementById('col-filesize');
const colModdate = document.getElementById('col-moddate');
const colPubdate = document.getElementById('col-pubdate');
const colIndex = document.getElementById('col-index');
const colTimestamp = document.getElementById('col-timestamp');
const colFolderpath = document.getElementById('col-folderpath');
const colDepth = document.getElementById('col-depth');

// Éléments pour la récursivité
const recursiveCheckbox = document.getElementById('recursive-scan');
const depthInput = document.getElementById('scan-depth');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const progressContainer = document.getElementById('progressContainer');
const scanStats = document.getElementById('scanStats');

// =============== FONCTIONS DE DÉBOGAGE ===============
function debugLog(message, data = null) {
  console.log(`🐛 [POPUP DEBUG] ${message}`, data || '');
}

function debugError(message, error = null) {
  console.error(`❌ [POPUP DEBUG] ${message}`, error || '');
}

function debugWarn(message, data = null) {
  console.warn(`⚠️ [POPUP DEBUG] ${message}`, data || '');
}

// Fonction pour afficher le statut
function showStatus(message, type = 'info') {
  debugLog(`Affichage du statut: "${message}" (type: ${type})`);
  statusEl.textContent = message;
  statusEl.className = 'status';
  if (type === 'error') {
    statusEl.classList.add('error');
  } else if (type === 'success') {
    statusEl.classList.add('success');
  } else if (type === 'progress') {
    statusEl.classList.add('progress');
  }
  
  // Effacer le message après 5 secondes (sauf si c'est en cours)
  if (type !== 'progress') {
    setTimeout(() => {
      if (!isScanning) {
        statusEl.textContent = '';
        statusEl.className = 'status';
        debugLog('Statut effacé automatiquement');
      }
    }, 5000);
  }
}

// Fonction pour mettre à jour la barre de progression
function updateProgress(current, total, message = '') {
  debugLog(`Mise à jour progression: ${current}/${total} - "${message}"`);
  
  if (progressContainer) {
    if (current > 0 && total > 0) {
      progressContainer.style.display = 'block';
    } else {
      progressContainer.style.display = 'none';
    }
  }
  
  if (progressBar && progressText) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = message || `${current}/${total} (${percentage}%)`;
    
    if (percentage === 100) {
      setTimeout(() => {
        progressBar.style.width = '0%';
        progressText.textContent = '';
        progressContainer.style.display = 'none';
        debugLog('Barre de progression masquée');
      }, 2000);
    }
  }
}

// Fonction pour obtenir l'onglet actif
async function getCurrentTab() {
  debugLog('Récupération de l\'onglet actif...');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    debugLog('Onglet actif récupéré:', {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      status: tab.status
    });
    return tab;
  } catch (error) {
    debugError('Erreur lors de la récupération de l\'onglet actif:', error);
    throw error;
  }
}

// Fonction pour attendre un délai
function delay(ms) {
  debugLog(`Attente de ${ms}ms...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fonction pour calculer la profondeur d'un URL par rapport à l'URL de base
function calculateDepth(baseUrl, currentUrl) {
  try {
    // Si les URLs sont identiques, profondeur = 0
    if (baseUrl === currentUrl) {
      return 0;
    }
    
    // Extraire les chemins des URLs
    const basePath = new URL(baseUrl).pathname;
    const currentPath = new URL(currentUrl).pathname;
    
    debugLog(`Calcul profondeur: base="${basePath}" vs current="${currentPath}"`);
    
    // Compter les segments de chemin supplémentaires
    const baseSegments = basePath.split('/').filter(seg => seg.length > 0);
    const currentSegments = currentPath.split('/').filter(seg => seg.length > 0);
    
    const depth = Math.max(0, currentSegments.length - baseSegments.length);
    debugLog(`Profondeur calculée: ${depth} (base: ${baseSegments.length} segments, current: ${currentSegments.length} segments)`);
    
    return depth;
  } catch (error) {
    debugError('Erreur lors du calcul de profondeur:', error);
    return 0;
  }
}

// Fonction pour scanner récursivement les dossiers
async function scanRecursively(tab, isRecursive = false, maxDepthLimit = 3) {
  debugLog('=== DÉBUT DU SCAN RÉCURSIF ===', {
    tabId: tab.id,
    tabUrl: tab.url,
    isRecursive,
    maxDepthLimit
  });
  
  let allFilesData = [];
  let scannedUrls = new Set();
  let urlsToScan = [];
  const baseUrl = tab.url; // URL de départ pour calculer les profondeurs
  let maxDepthReached = 0;
  
  try {
    // Scanner la page actuelle (profondeur 0)
    debugLog('Envoi du message scanPage à l\'onglet actuel...');
    showStatus('Analyse de la page principale...', 'progress');
    
    const initialResponse = await chrome.tabs.sendMessage(tab.id, { action: 'scanPage' });
    debugLog('Réponse reçue pour scanPage:', initialResponse);
    
    if (initialResponse.success) {
      debugLog(`Page principale scannée avec succès: ${initialResponse.data.length} fichiers trouvés`);
      
      // Ajouter les fichiers de la page principale avec profondeur 0
      const mainPageFiles = initialResponse.data.map(file => ({
        ...file,
        folderUrl: baseUrl,
        depth: 0
      }));
      
      allFilesData = [...mainPageFiles];
      scannedUrls.add(baseUrl);
      
      debugLog('Données des fichiers de la page principale:', mainPageFiles);
      
      if (isRecursive && maxDepthLimit > 0) {
        debugLog('Début du scan récursif des sous-dossiers...');
        
        // Récupérer les liens vers les sous-dossiers de la page principale
        const foldersResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getFolders' });
        debugLog('Réponse getFolders:', foldersResponse);
        
        if (foldersResponse.success && foldersResponse.folders.length > 0) {
          // Initialiser la queue avec les dossiers de niveau 1
          urlsToScan = foldersResponse.folders
            .filter(url => !scannedUrls.has(url))
            .map(url => ({
              url: url,
              depth: 1,
              parentUrl: baseUrl
            }));
          
          debugLog(`${urlsToScan.length} sous-dossiers de niveau 1 à scanner:`, urlsToScan);
          
          let processedCount = 0;
          let totalToProcess = urlsToScan.length;
          
          // Scanner chaque dossier dans la queue
          while (urlsToScan.length > 0) {
            const currentFolder = urlsToScan.shift();
            const { url: folderUrl, depth: folderDepth } = currentFolder;
            
            // Vérifier si nous n'avons pas dépassé la profondeur maximale
            if (folderDepth > maxDepthLimit) {
              debugLog(`Profondeur maximale atteinte (${folderDepth} > ${maxDepthLimit}), arrêt du scan pour ${folderUrl}`);
              continue;
            }
            
            processedCount++;
            debugLog(`Scan du dossier ${processedCount}/${totalToProcess}: ${folderUrl} (profondeur: ${folderDepth})`);
            
            try {
              updateProgress(processedCount, totalToProcess, `Dossier ${processedCount}/${totalToProcess} (niveau ${folderDepth})`);
              showStatus(`Analyse du dossier ${processedCount}/${totalToProcess} (niveau ${folderDepth})...`, 'progress');
              
              // Naviguer vers le dossier
              debugLog(`Navigation vers: ${folderUrl}`);
              await chrome.tabs.update(tab.id, { url: folderUrl });
              await delay(2000); // Attendre le chargement de la page
              
              // Scanner le dossier
              debugLog('Envoi du message scanPage pour le sous-dossier...');
              const folderResponse = await chrome.tabs.sendMessage(tab.id, { action: 'scanPage' });
              debugLog(`Réponse scanPage pour ${folderUrl}:`, folderResponse);
              
              if (folderResponse.success) {
                debugLog(`Sous-dossier scanné: ${folderResponse.data.length} fichiers trouvés`);
                
                // Ajouter les fichiers trouvés avec la bonne profondeur
                const folderFiles = folderResponse.data.map(file => ({
                  ...file,
                  folderUrl: folderUrl,
                  depth: folderDepth
                }));
                
                allFilesData = [...allFilesData, ...folderFiles];
                scannedUrls.add(folderUrl);
                maxDepthReached = Math.max(maxDepthReached, folderDepth);
                
                debugLog(`Total fichiers après ce dossier: ${allFilesData.length}, profondeur: ${folderDepth}`);
                
                // Si on n'a pas atteint la profondeur maximale, chercher des sous-dossiers
                if (folderDepth < maxDepthLimit) {
                  const subFoldersResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getFolders' });
                  if (subFoldersResponse.success && subFoldersResponse.folders.length > 0) {
                    const newFolders = subFoldersResponse.folders
                      .filter(url => !scannedUrls.has(url))
                      .map(url => ({
                        url: url,
                        depth: folderDepth + 1,
                        parentUrl: folderUrl
                      }));
                    
                    if (newFolders.length > 0) {
                      urlsToScan = [...urlsToScan, ...newFolders];
                      totalToProcess += newFolders.length;
                      debugLog(`${newFolders.length} nouveaux sous-dossiers de niveau ${folderDepth + 1} ajoutés à la queue`);
                    }
                  }
                }
              } else {
                debugWarn(`Échec du scan du sous-dossier ${folderUrl}:`, folderResponse.error);
              }
              
              await delay(1000); // Pause entre les requêtes
              
            } catch (error) {
              debugError(`Erreur lors du scan du dossier ${folderUrl}:`, error);
              continue;
            }
          }
        } else {
          debugLog('Aucun sous-dossier trouvé ou erreur getFolders');
        }
      } else {
        debugLog('Scan récursif non activé ou profondeur maximale = 0');
      }
      
      debugLog('=== FIN DU SCAN RÉCURSIF ===', {
        totalFiles: allFilesData.length,
        scannedFolders: scannedUrls.size,
        maxDepthReached: maxDepthReached
      });
      
      // Vérifier les profondeurs dans les données finales
      const depthStats = {};
      allFilesData.forEach(file => {
        const depth = file.depth || 0;
        depthStats[depth] = (depthStats[depth] || 0) + 1;
      });
      debugLog('Statistiques des profondeurs:', depthStats);
      
      return {
        success: true,
        data: allFilesData,
        count: allFilesData.length,
        scannedFolders: scannedUrls.size,
        depth: maxDepthReached
      };
      
    } else {
      debugError('Échec du scan de la page principale:', initialResponse.error);
      throw new Error(initialResponse.error || 'Erreur lors de l\'analyse initiale');
    }
    
  } catch (error) {
    debugError('Erreur dans scanRecursively:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      count: 0
    };
  }
}

// Fonction pour scanner la page (avec ou sans récursivité)
async function scanPage() {
  debugLog('=== DÉBUT DU SCAN DE PAGE ===');
  
  try {
    isScanning = true;
    scanBtn.disabled = true;
    scanBtn.textContent = 'Analyse...';
    exportBtn.disabled = true;
    
    debugLog('État du scan:', {
      isScanning,
      scanBtnDisabled: scanBtn.disabled,
      exportBtnDisabled: exportBtn.disabled
    });
    
    const tab = await getCurrentTab();
    
    // Vérifier que nous sommes sur le bon site
    debugLog('Vérification de l\'URL du site...');
    if (!tab.url.includes('connect.bontaz.com')) {
      debugError('Site incorrect:', tab.url);
      throw new Error('Cette extension ne fonctionne que sur connect.bontaz.com');
    }
    debugLog('Site correct, poursuite du scan');
    
    const isRecursive = recursiveCheckbox && recursiveCheckbox.checked;
    const maxDepthLimit = depthInput ? parseInt(depthInput.value) || 3 : 3;
    
    debugLog('Options de scan:', {
      isRecursive,
      maxDepthLimit,
      recursiveCheckboxExists: !!recursiveCheckbox,
      recursiveCheckboxChecked: recursiveCheckbox ? recursiveCheckbox.checked : 'N/A',
      depthInputExists: !!depthInput,
      depthInputValue: depthInput ? depthInput.value : 'N/A'
    });
    
    let response;
    
    if (isRecursive) {
      debugLog('Lancement du scan récursif...');
      showStatus('Analyse récursive en cours...', 'progress');
      response = await scanRecursively(tab, true, maxDepthLimit);
    } else {
      debugLog('Lancement du scan simple...');
      showStatus('Analyse de la page en cours...', 'progress');
      
      // Envoyer le message directement pour un scan simple
      debugLog('Envoi du message scanPage...');
      response = await chrome.tabs.sendMessage(tab.id, { action: 'scanPage' });
      debugLog('Réponse reçue pour le scan simple:', response);
      
      // Pour un scan simple, ajouter la profondeur 0
      if (response.success && response.data) {
        response.data = response.data.map(file => ({
          ...file,
          depth: 0,
          folderUrl: tab.url
        }));
      }
    }
    
    debugLog('Réponse finale du scan:', response);
    
    if (response.success) {
      filesData = response.data;
      filesCount = response.count;
      
      debugLog('Données finales du scan:', {
        filesDataLength: filesData ? filesData.length : 0,
        filesCount,
        sampleData: filesData ? filesData.slice(0, 3) : 'Aucune donnée'
      });
      
      // Mettre à jour l'affichage
      let countText = `${filesCount} fichier(s) trouvé(s)`;
      if (isRecursive && response.scannedFolders > 1) {
        countText += ` dans ${response.scannedFolders} dossier(s)`;
        if (response.depth > 0) {
          countText += ` (profondeur max: ${response.depth})`;
        }
      }
      
      debugLog('Texte de comptage:', countText);
      
      filesCountEl.textContent = countText;
      filesCountEl.style.color = filesCount > 0 ? '#28a745' : '#dc3545';
      
      // Mettre à jour les statistiques
      if (scanStats) {
        let statsText = '';
        if (filesCount > 0) {
          const uniqueFolders = new Set();
          const authors = new Set();
          const depthStats = {};
          
          if (filesData && Array.isArray(filesData)) {
            filesData.forEach(file => {
              if (file.folderPath) uniqueFolders.add(file.folderPath);
              if (file.author && file.author !== 'N/A') authors.add(file.author);
              const depth = file.depth || 0;
              depthStats[depth] = (depthStats[depth] || 0) + 1;
            });
          }
          
          statsText = `${uniqueFolders.size} dossier(s), ${authors.size} auteur(s)`;
          
          // Ajouter les statistiques de profondeur si scan récursif
          if (isRecursive && Object.keys(depthStats).length > 1) {
            const depthInfo = Object.entries(depthStats)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([depth, count]) => `N${depth}: ${count}`)
              .join(', ');
            statsText += ` | ${depthInfo}`;
          }
        }
        scanStats.textContent = statsText;
        debugLog('Statistiques affichées:', statsText);
      }
      
      // Activer le bouton d'export si des fichiers sont trouvés
      exportBtn.disabled = filesCount === 0;
      debugLog('Bouton export activé:', !exportBtn.disabled);
      
      if (filesCount > 0) {
        let successMessage = `Analyse terminée : ${filesCount} fichiers trouvés`;
        if (isRecursive && response.scannedFolders > 1) {
          successMessage += ` dans ${response.scannedFolders} dossiers`;
          if (response.depth > 0) {
            successMessage += ` (profondeur max: ${response.depth})`;
          }
        }
        showStatus(successMessage, 'success');
      } else {
        debugWarn('Aucun fichier trouvé');
        showStatus('Aucun fichier trouvé', 'error');
      }
      
      // Réinitialiser la barre de progression
      updateProgress(0, 0);
      
    } else {
      debugError('Échec du scan:', response.error);
      throw new Error(response.error || 'Erreur lors de l\'analyse');
    }
  } catch (error) {
  debugError('Erreur lors du scan:', error);

  const specificConnectionError = "Could not establish connection. Receiving end does not exist.";

  if (error && error.message && error.message === specificConnectionError) {
    showStatus('Erreur de connexion avec l\'onglet. Veuillez rafraîchir la page de l\'onglet que vous analysez, puis réessayez.', 'error');
  } else {
    showStatus(`Erreur : ${error.message}`, 'error');
  }

  // Le reste du traitement d'erreur est commun
  filesCountEl.textContent = 'Erreur lors de l\'analyse'; // Ou vous pourriez aussi personnaliser ce message
  filesCountEl.style.color = '#dc3545';
  exportBtn.disabled = true;
  updateProgress(0, 0);

  } finally {
    debugLog('Nettoyage final du scan');
    isScanning = false;
    scanBtn.disabled = false;
    scanBtn.textContent = 'Scanner';
    
    debugLog('État final:', {
      isScanning,
      scanBtnDisabled: scanBtn.disabled,
      exportBtnDisabled: exportBtn.disabled,
      filesCount,
      filesDataExists: !!filesData
    });
  }
  
  debugLog('=== FIN DU SCAN DE PAGE ===');
}

// Fonction pour exporter en CSV
async function exportCSV() {
  debugLog('=== DÉBUT DE L\'EXPORT CSV ===');
  
  try {
    // Vérifier qu'au moins une colonne est sélectionnée
    const columns = {
      filename: colFilename.checked,
      author: colAuthor.checked,
      url: colUrl.checked,
      version: colVersion.checked,
      filesize: colFilesize.checked,
      moddate: colModdate.checked,
      pubdate: colPubdate.checked,
      folderpath: colFolderpath ? colFolderpath.checked : false,
      depth: colDepth ? colDepth.checked : false,
      timestamp: colTimestamp.checked
    };
    
    debugLog('Colonnes sélectionnées:', columns);
    
    const hasColumns = Object.values(columns).some(val => val);
    if (!hasColumns) {
      debugWarn('Aucune colonne sélectionnée');
      showStatus('Veuillez sélectionner au moins une colonne', 'error');
      return;
    }
    
    debugLog('Données à exporter:', {
      filesDataExists: !!filesData,
      filesDataLength: filesData ? filesData.length : 0,
      filesCount
    });
    
    exportBtn.disabled = true;
    exportBtn.textContent = 'Export...';
    showStatus('Génération du fichier CSV...', 'progress');
    
    const tab = await getCurrentTab();
    
    debugLog('Envoi du message exportCSV...');
    const response = await chrome.tabs.sendMessage(tab.id, { 
      action: 'exportCSV',
      columns: columns,
      data: filesData // Passer les données si scan récursif
    });
    
    debugLog('Réponse exportCSV:', response);
    
    if (response.success) {
      debugLog('Export réussi:', {
        filename: response.filename,
        totalFiles: response.totalFiles,
        isRecursive: response.isRecursive
      });
      showStatus(`Fichier exporté : ${response.filename}`, 'success');
    } else {
      debugError('Échec de l\'export:', response.error);
      throw new Error(response.error || 'Erreur lors de l\'export');
    }
  } catch (error) {
    debugError('Erreur lors de l\'export:', error);
    showStatus(`Erreur lors de l'export : ${error.message}`, 'error');
  } finally {
    exportBtn.disabled = false;
    exportBtn.textContent = 'Exporter CSV';
  }
  
  debugLog('=== FIN DE L\'EXPORT CSV ===');
}

// Gestionnaire pour l'activation/désactivation du scan récursif
function toggleRecursiveOptions() {
  debugLog('Toggle des options récursives');
  if (recursiveCheckbox && depthInput) {
    const isChecked = recursiveCheckbox.checked;
    depthInput.disabled = !isChecked;
    if (!isChecked) {
      depthInput.value = '3'; // Valeur par défaut
    }
    debugLog('Options récursives mises à jour:', {
      recursiveChecked: isChecked,
      depthInputDisabled: depthInput.disabled,
      depthValue: depthInput.value
    });
  }
}

// Gestionnaires d'événements
scanBtn.addEventListener('click', () => {
  debugLog('Clic sur le bouton Scanner');
  scanPage();
});

exportBtn.addEventListener('click', () => {
  debugLog('Clic sur le bouton Exporter');
  exportCSV();
});

if (recursiveCheckbox) {
  recursiveCheckbox.addEventListener('change', () => {
    debugLog('Changement du checkbox récursif');
    toggleRecursiveOptions();
  });
}

// Sauvegarder les préférences des colonnes et options
function savePreferences() {
  debugLog('Sauvegarde des préférences...');
  const prefs = {
    // Colonnes
    filename: colFilename.checked,
    author: colAuthor.checked,
    url: colUrl.checked,
    version: colVersion.checked,
    filesize: colFilesize.checked,
    moddate: colModdate.checked,
    pubdate: colPubdate.checked,
    folderpath: colFolderpath ? colFolderpath.checked : false,
    depth: colDepth ? colDepth.checked : false,
    index: colIndex.checked,
    timestamp: colTimestamp.checked,
    // Options récursives
    recursive: recursiveCheckbox ? recursiveCheckbox.checked : false,
    maxDepth: depthInput ? parseInt(depthInput.value) || 3 : 3
  };
  
  debugLog('Préférences à sauvegarder:', prefs);
  chrome.storage.local.set({ preferences: prefs });
}

// Charger les préférences
function loadPreferences() {
  debugLog('Chargement des préférences...');
  chrome.storage.local.get(['preferences'], (result) => {
    debugLog('Préférences chargées:', result.preferences);
    
    if (result.preferences) {
      const prefs = result.preferences;
      
      // Colonnes
      colFilename.checked = prefs.filename !== false;
      colAuthor.checked = prefs.author !== false;
      colUrl.checked = prefs.url !== false;
      colVersion.checked = prefs.version || false;
      colFilesize.checked = prefs.filesize || false;
      colModdate.checked = prefs.moddate || false;
      colPubdate.checked = prefs.pubdate || false;
      if (colFolderpath) colFolderpath.checked = prefs.folderpath || false;
      if (colDepth) colDepth.checked = prefs.depth || false;
      colIndex.checked = prefs.index || false;
      colTimestamp.checked = prefs.timestamp || false;
      
      // Options récursives
      if (recursiveCheckbox) {
        recursiveCheckbox.checked = prefs.recursive || false;
      }
      if (depthInput) {
        depthInput.value = prefs.maxDepth || 3;
      }
      
      toggleRecursiveOptions();
      
      debugLog('Préférences appliquées avec succès');
    } else {
      debugLog('Aucune préférence sauvegardée trouvée');
    }
  });
}

// Ajouter des gestionnaires pour sauvegarder les préférences
const allInputs = [colFilename, colAuthor,colUrl, colVersion, colFilesize, colModdate, colPubdate, colIndex, colTimestamp];
if (colFolderpath) allInputs.push(colFolderpath);
if (colDepth) allInputs.push(colDepth);
if (recursiveCheckbox) allInputs.push(recursiveCheckbox);
if (depthInput) allInputs.push(depthInput);

allInputs.forEach(input => {
  if (input) {
    input.addEventListener('change', () => {
      debugLog(`Changement de préférence: ${input.id}`);
      savePreferences();
    });
  }
});

// Fonction pour annuler le scan en cours
function cancelScan() {
  debugLog('Annulation du scan demandée');
  if (isScanning) {
    isScanning = false;
    scanBtn.disabled = false;
    scanBtn.textContent = 'Scanner';
    showStatus('Scan annulé', 'error');
    updateProgress(0, 0);
    debugLog('Scan annulé avec succès');
  }
}

// Ajouter un bouton d'annulation si nécessaire
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isScanning) {
    debugLog('Touche Échap détectée pendant le scan');
    cancelScan();
  }
});

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  debugLog('=== INITIALISATION DE LA POPUP ===');
  
  loadPreferences();
  
  // Vérifier si nous sommes sur la bonne page
  getCurrentTab().then(tab => {
    debugLog('Vérification de la page pour l\'initialisation:', tab.url);
    
    if (!tab.url.includes('connect.bontaz.com')) {
      debugWarn('Page incorrecte détectée:', tab.url);
      showStatus('Cette extension ne fonctionne que sur connect.bontaz.com', 'error');
      scanBtn.disabled = true;
    } else {
      debugLog('Page correcte, extension prête');
    }
  }).catch(error => {
    debugError('Erreur lors de la vérification de la page:', error);
  });
  
  // Initialiser les options récursives
  toggleRecursiveOptions();
  
  debugLog('=== INITIALISATION TERMINÉE ===');
});