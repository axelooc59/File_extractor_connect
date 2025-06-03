// Script de contenu qui s'exécute sur la page Bontaz
let extractedData = [];
let currentUrl = '';

function clickWhileNotNull() {
  return new Promise((resolve) => {
    console.log('🔍 [DEBUG] Début de clickWhileNotNull()');
    let test = document.querySelector('.btn.btn-default.btn-block.see-more-btn');

    if (test === null) {
      console.log('🔍 [DEBUG] Aucun bouton "voir plus" trouvé, résolution immédiate');
      resolve();
      return;
    }

    const intervalId = setInterval(() => {
      test = document.querySelector('.btn.btn-default.btn-block.see-more-btn');

      if (test !== null) {
        test.click();
        console.log("Clicked on the element!");
      } else {
        console.log("Element is null. Stopping the clicks.");
        clearInterval(intervalId);
        console.log('🔍 [DEBUG] clickWhileNotNull terminé, résolution de la Promise');
        resolve(); // Résoudre la Promise quand les clics sont terminés
      }
    }, 1500);
  });
}



function extractFolderLinks() {
  try {
    console.log('🔍 [DEBUG] Début de extractFolderLinks()');
    const folderLinks = [];

    // Chercher le conteneur principal des dossiers
    const mainContainer = document.querySelector('div.explorer-table-body.ajax-refresh-div.explorer-section-categories.js-draggable-elements');
    console.log('🔍 [DEBUG] Conteneur principal (div.explorer-table-body...) trouvé:', mainContainer ? 'Oui' : 'Non');

    if (mainContainer) {
      // Sélectionner les divs enfants directs qui ont l'attribut 'data-jalios-explorer-history'
      // Ces divs sont supposées être les "lignes" de dossier
      const folderElements = mainContainer.querySelectorAll(':scope > div[data-jalios-explorer-history]');
      console.log('🔍 [DEBUG] Éléments de dossier (divs enfants avec data-jalios-explorer-history) trouvés:', folderElements.length);

      folderElements.forEach((folderDiv, index) => {
        const href = folderDiv.getAttribute('data-jalios-explorer-history');
        let filename = `Dossier ${index + 1}`; // Nom par défaut

        // Essayer de trouver un nom plus descriptif pour le dossier à l'intérieur de folderDiv
        // Cibler des sélecteurs communs pour le nom. Cette liste peut nécessiter des ajustements.
        const nameSelectors = [
          '.explorer-table-resource-name a',          // Lien dans une cellule de nom
          '.explorer-table-resource-name span[title]',// Span avec titre dans une cellule de nom
          '.explorer-table-resource-name',            // Contenu direct d'une cellule de nom
          'a.js-title',                               // Ancien sélecteur de titre (lien)
          'span.js-title',                            // Ancien sélecteur de titre (span)
          'a[title]',                                 // Tout lien avec un attribut title
          '[role="button"] span',                     // Span dans un élément avec role="button"
          'a'                                         // En dernier recours, le texte de n'importe quel lien
        ];
        
        for (const selector of nameSelectors) {
          const nameElement = folderDiv.querySelector(selector);
          if (nameElement) {
            const textContent = nameElement.textContent?.trim();
            const titleAttr = nameElement.getAttribute('title')?.trim();
            if (textContent) { 
              filename = textContent; 
              break; 
            }
            if (titleAttr) { 
              filename = titleAttr; 
              break; 
            }
          }
        }

        // Si aucun nom n'a été trouvé par les sélecteurs, essayer aria-label ou title de folderDiv lui-même
        if (filename === `Dossier ${index + 1}`) {
            const ariaLabel = folderDiv.getAttribute('aria-label')?.trim();
            const titleAttr = folderDiv.getAttribute('title')?.trim();
            if (ariaLabel) {
                filename = ariaLabel;
            } else if (titleAttr) {
                filename = titleAttr;
            }
        }
        
        console.log(`🔍 [DEBUG] Élément ${index}: "${filename}" -> data-jalios-explorer-history: "${href}"`);

        if (href) {
          // Construire l'URL complète.
          // new URL(href, window.location.href) résoudra correctement les URLs absolues,
          // relatives au domaine (commençant par /) ou relatives au chemin actuel.
          const fullUrl = new URL(href, window.location.href).href;
          
          folderLinks.push({
            name: filename,
            url: fullUrl
          });
          console.log(`🔍 [DEBUG] Dossier ajouté: "${filename}" -> ${fullUrl}`);
        } else {
          console.log(`🔍 [DEBUG] Élément ${index}: "${filename}" -> data-jalios-explorer-history est vide ou null.`);
        }
      });
    } else {
      console.log('🔍 [DEBUG] Le conteneur principal des dossiers (div.explorer-table-body...) n\'a pas été trouvé.');
    }
    
    // L'ancienne logique pour les liens de navigation a été commentée car
    // les instructions se concentrent sur la nouvelle méthode d'extraction.
    // Vous pouvez la décommenter ou l'adapter si nécessaire.
    /*
    const navLinks = document.querySelectorAll('.breadcrumb a, .navigation a, .explorer-nav a');
    console.log('🔍 [DEBUG] Liens de navigation trouvés:', navLinks.length);
    
    navLinks.forEach((link, index) => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim();
      console.log(`🔍 [DEBUG] Lien nav ${index}: "${text}" -> href: "${href}"`);
      
      if (href && text && href.includes('connect.bontaz.com') && !folderLinks.some(f => f.url === href)) {
        const fullUrl = new URL(href, window.location.href).href;
        folderLinks.push({
          name: text,
          url: fullUrl
        });
        console.log(`🔍 [DEBUG] Dossier nav ajouté: "${text}" -> ${fullUrl}`);
      }
    });
    */
    
    console.log('🔍 [DEBUG] Total dossiers trouvés:', folderLinks.length);
    
    return {
      success: true,
      folders: folderLinks.map(f => f.url), // Conserve la liste des URLs pour la compatibilité
      folderData: folderLinks // Conserve la liste des objets {name, url}
    };
  } catch (error) {
    console.error('❌ [DEBUG] Erreur lors de l\'extraction des dossiers:', error);
    return {
      success: false,
      error: error.message,
      folders: [],
      folderData: []
    };
  }
}

// Fonction pour extraire le chemin du dossier actuel
function getCurrentFolderPath() {
  try {
    console.log('🔍 [DEBUG] Début de getCurrentFolderPath()');
    console.log('🔍 [DEBUG] URL actuelle:', window.location.href);
    
    // Essayer de récupérer le chemin depuis l'URL
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);
    console.log('🔍 [DEBUG] Parties du chemin URL:', pathParts);
    
    // Ou depuis les breadcrumbs
    const breadcrumbs = document.querySelectorAll('.breadcrumb li, .breadcrumb-item');
    console.log('🔍 [DEBUG] Breadcrumbs trouvés:', breadcrumbs.length);
    
    if (breadcrumbs.length > 0) {
      const pathArray = Array.from(breadcrumbs).map(bc => bc.textContent.trim()).filter(text => text.length > 0);
      console.log('🔍 [DEBUG] Chemin depuis breadcrumbs:', pathArray);
      return pathArray.join(' > ');
    }
    
    // Ou depuis le title de la page
    const pageTitle = document.title;
    console.log('🔍 [DEBUG] Titre de la page:', pageTitle);
    
    if (pageTitle && pageTitle.includes('Bontaz')) {
      const extracted = pageTitle.replace(/.*Bontaz\s*[-:]?\s*/, '').trim();
      console.log('🔍 [DEBUG] Chemin extrait du titre:', extracted);
      return extracted;
    }
    
    // Fallback vers l'URL
    const fallback = pathParts.join('/') || 'Racine';
    console.log('🔍 [DEBUG] Chemin fallback:', fallback);
    return fallback;
  } catch (error) {
    console.error('❌ [DEBUG] Erreur getCurrentFolderPath:', error);
    return window.location.pathname || 'Inconnu';
  }
}

// Fonction pour extraire les données de la page
async function extractFileData() {

  await clickWhileNotNull();

  try {
    console.log('🔍 [DEBUG] ========== Début de extractFileData() ==========');
    console.log('🔍 [DEBUG] URL actuelle:', window.location.href);
    console.log('🔍 [DEBUG] Document ready state:', document.readyState);
    
    // Chercher tous les sélecteurs possibles pour les éléments de fichiers
    const possibleSelectors = [
      '.js-title.js-truncated',
      'a.js-title.js-truncated',
      '.js-title',
      '.js-truncated',
      '[class*="js-title"]',
      '[class*="js-truncated"]'
    ];
    
    let elements = null;
    let usedSelector = '';
    
    for (const selector of possibleSelectors) {
      const found = document.querySelectorAll(selector);
      console.log(`🔍 [DEBUG] Sélecteur "${selector}": ${found.length} éléments trouvés`);
      
      if (found.length > 0) {
        elements = found;
        usedSelector = selector;
        break;
      }
      
    }
    
    if (!elements || elements.length === 0) {
      console.log('🔍 [DEBUG] Aucun élément trouvé avec les sélecteurs principaux. Essai d\'autres sélecteurs...');
      
      // Essayer d'autres sélecteurs possibles
      const alternativeSelectors = [
        'a[href*="/"]',
        '.file-name',
        '.filename',
        'td a',
        'tr a',
        '[class*="file"]',
        '[class*="name"]'
      ];
      
      for (const selector of alternativeSelectors) {
        const found = document.querySelectorAll(selector);
        console.log(`🔍 [DEBUG] Sélecteur alternatif "${selector}": ${found.length} éléments trouvés`);
        
        if (found.length > 0) {
          elements = found;
          usedSelector = selector;
          break;
        }
      }
    }
    
    if (!elements || elements.length === 0) {
      console.log('❌ [DEBUG] Aucun élément de fichier trouvé sur la page');
      console.log('🔍 [DEBUG] Structure HTML disponible:');
      console.log(document.body.innerHTML.substring(0, 1000) + '...');
      
      return {
        success: false,
        error: 'Aucun élément de fichier trouvé sur la page',
        count: 0,
        data: [],
        folderPath: getCurrentFolderPath(),
        url: window.location.href
      };
    }
    
    console.log(`🔍 [DEBUG] Utilisation du sélecteur: "${usedSelector}" (${elements.length} éléments)`);
    
    //Récupération des liens des fichiers
    const urls=document.querySelectorAll('a.is-action.noTooltipCard.ctxTooltipCard')
    console.log('🔍 [DEBUG] Éléments urls trouvés:', urls.length);



    // Récupération des auteurs (BPO)
    const BPOS = document.querySelectorAll('.explorer-table-col.explorer-table-col-author.is-member.item-member-photo');
    console.log('🔍 [DEBUG] Éléments BPO trouvés:', BPOS.length);
    
    // Récupération des dates de modification
    const modDateElements = document.querySelectorAll('div.explorer-table-col.explorer-table-col-mdate.is-date.item-date');
    console.log('🔍 [DEBUG] Éléments de date de modification trouvés:', modDateElements.length);
    
    // Récupération des versions
    const versionDivs = document.querySelectorAll('div.explorer-table-col.explorer-table-col-version.is-numeric');
    console.log('🔍 [DEBUG] Éléments de version trouvés:', versionDivs.length);
    
    const versions = [];
    versionDivs.forEach((div, index) => {
      const textContent = div.textContent.trim();
      console.log(`🔍 [DEBUG] Version ${index}: "${textContent}"`);
      if(textContent !== ''){
        versions.push(textContent)
      }
    });
    
    // Récupération des tailles de fichiers
    const sizeDivs = document.querySelectorAll('div.explorer-table-col.explorer-table-col-size.is-numeric');
    console.log('🔍 [DEBUG] Éléments de taille trouvés:', sizeDivs.length);
    
    const fileSizes = [];
    sizeDivs.forEach((div, index) => {
      const abbrElement = div.querySelector('abbr');
      const fullText = div.textContent;
      const abbrText = abbrElement ? abbrElement.textContent : '';
      const numericPart = fullText.replace(abbrText, '').trim();
      
      console.log(`🔍 [DEBUG] Taille ${index}: fullText="${fullText}", abbrText="${abbrText}", numericPart="${numericPart}"`);
      
      const value = parseFloat(numericPart.replace(',', '.'));
      let unit = '';
      let convertedValue = value;
      
      if (abbrElement && abbrElement.hasAttribute('title')) {
        const title = abbrElement.getAttribute('title');
        if (title === 'mega octets') {
          unit = 'Mo';
        } else if (title === 'kilo octets') {
          unit = 'Mo';
          convertedValue = value / 1024;
        } else {
          unit = abbrText;
        }
      } else {
        unit = abbrText;
      }
      
      if (!isNaN(value)) {
        fileSizes.push(`${convertedValue.toFixed(2)} ${unit}`);
      } 
    });
    
    const data = [];
    const currentPath = getCurrentFolderPath();
    currentUrl = window.location.href;
    
    console.log('🔍 [DEBUG] Début de l\'analyse des éléments...');
    
    elements.forEach((element, index) => {
      try {
        const filename = element.textContent.trim();
        console.log(`🔍 [DEBUG] Élément ${index}: "${filename}"`);
        
        // Filtrer les dossiers si on ne veut que les fichiers
        const hasExtension = filename.includes('.');
        const endsWithSlash = filename.endsWith('/');
        const isFile = hasExtension && !endsWithSlash;
        
        console.log(`🔍 [DEBUG] "${filename}" - hasExtension: ${hasExtension}, endsWithSlash: ${endsWithSlash}, isFile: ${isFile}`);
        
        // if (!isFile) {
        //   console.log(`🔍 [DEBUG] "${filename}" ignoré (considéré comme dossier)`);
        //   return; // Ignorer les dossiers dans l'extraction des fichiers
        // }
        
        let author = '';
        let modificationDate = '';
        let publicationDate = '';

        let url='https://connect.bontaz.com/jplatform/'+urls[index].getAttribute('href')
        console.log(`🔍 [DEBUG] Url ${index}: "${url}"`);
        
        // Récupération de l'auteur
        if (BPOS[index] && BPOS[index].childNodes[2]) {
          author = BPOS[index].childNodes[2].textContent.trim();
          console.log(`🔍 [DEBUG] Auteur ${index}: "${author}"`);
        }
        
        // Récupération des dates
        if (modDateElements[index]) {
          const srOnlyElement = modDateElements[index].querySelector('span.sr-only');
          if (srOnlyElement) {
            modificationDate = srOnlyElement.textContent.trim();
          }
          
          if (modDateElements[index].hasAttribute('title')) {
            publicationDate = modDateElements[index].getAttribute('title');
          }
          
          console.log(`🔍 [DEBUG] Dates ${index}: mod="${modificationDate}", pub="${publicationDate}"`);
        }
        
        const fileData = {
          index: index + 1,
          filename: filename,
          author: author,
          version: versions[index] || 'N/A',
          filesize: fileSizes[index] || 'N/A',
          modificationDate: modificationDate || 'N/A',
          publicationDate: publicationDate || 'N/A',
          url:url,
          folderPath: currentPath,
          folderUrl: currentUrl,
          depth: 0, // Sera mis à jour lors du scan récursif
          timestamp: new Date().toISOString()
        };
        
        console.log(`✅ [DEBUG] Fichier ${index} ajouté:`, fileData);
        if(author!==''){
          data.push(fileData);
        }
      } catch (err) {
        console.error(`❌ [DEBUG] Erreur lors de l'extraction de l'élément ${index}:`, err);
      }
    });
    
    console.log(`🔍 [DEBUG] ========== Résultat final ==========`);
    console.log(`🔍 [DEBUG] Nombre total d'éléments analysés: ${elements.length}`);
    console.log(`🔍 [DEBUG] Nombre de fichiers extraits: ${data.length}`);
    console.log('🔍 [DEBUG] Données extraites:', data);
    
    extractedData = data;
    return {
      success: true,
      count: data.length,
      data: data,
      folderPath: currentPath,
      url: currentUrl
    };
  } catch (error) {
    console.error('❌ [DEBUG] Erreur lors de l\'extraction:', error);
    console.error('❌ [DEBUG] Stack trace:', error.stack);
    return {
      success: false,
      error: error.message,
      count: 0,
      data: [],
      folderPath: getCurrentFolderPath(),
      url: window.location.href
    };
  }
}

// Fonction pour générer le CSV
function generateCSV(data, columns) {
  console.log('🔍 [DEBUG] generateCSV appelée avec', data?.length, 'éléments');
  
  if (!data || data.length === 0) {
    console.log('❌ [DEBUG] Aucune donnée à exporter');
    return '';
  }
  
  // Créer l'en-tête
  const headers = [];
  if (columns.index) headers.push('Index');
  if (columns.filename) headers.push('Nom du fichier');
  if (columns.url) headers.push('Url du fichier');
  if (columns.author) headers.push('Auteur (BPO)');
  if (columns.version) headers.push('Version');
  if (columns.filesize) headers.push('Taille du fichier');
  if (columns.moddate) headers.push('Date de modification');
  if (columns.pubdate) headers.push('Date de publication');
  if (columns.folderpath) headers.push('Chemin du dossier');
  if (columns.depth) headers.push('Profondeur');
  if (columns.timestamp) headers.push('Horodatage d\'extraction');
  
  console.log('🔍 [DEBUG] En-têtes CSV:', headers);
  
  // Fonction pour échapper les valeurs CSV
  function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }
  
  // Créer les lignes de données
  const rows = data.map(item => {
    const row = [];
    if (columns.index) row.push(escapeCSV(item.index));
    if (columns.filename) row.push(escapeCSV(item.filename));
    if (columns.url) row.push(escapeCSV(item.url));
    if (columns.author) row.push(escapeCSV(item.author));
    if (columns.version) row.push(escapeCSV(item.version));
    if (columns.filesize) row.push(escapeCSV(item.filesize));
    if (columns.moddate) row.push(escapeCSV(item.modificationDate));
    if (columns.pubdate) row.push(escapeCSV(item.publicationDate));
    if (columns.folderpath) row.push(escapeCSV(item.folderPath || item.folderUrl || 'N/A'));
    if (columns.depth) row.push(escapeCSV(item.depth || 0));
    if (columns.timestamp) row.push(escapeCSV(item.timestamp));
    return row.join(';');
  });
  
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
  console.log('🔍 [DEBUG] CSV généré, taille:', csvContent.length, 'caractères');
  
  return csvContent;
}

// Fonction pour télécharger le fichier CSV
function downloadCSV(csvContent, filename) {
  console.log('🔍 [DEBUG] downloadCSV appelée, fichier:', filename);
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('✅ [DEBUG] Téléchargement initié');
  } else {
    console.error('❌ [DEBUG] Téléchargement non supporté');
  }
}

// Fonction pour attendre le chargement de la page
function waitForPageLoad(timeout = 5000) {
  return new Promise((resolve, reject) => {
    console.log('🔍 [DEBUG] Attente du chargement de la page...');
    const startTime = Date.now();
    
    function checkReady() {
      // Vérifier si les éléments principaux sont chargés
      const elements = document.querySelectorAll('.js-title.js-truncated');
      const isReady = elements.length > 0 || document.readyState === 'complete';
      
      console.log(`🔍 [DEBUG] Check ready: éléments=${elements.length}, readyState=${document.readyState}, isReady=${isReady}`);
      
      if (isReady) {
        console.log('✅ [DEBUG] Page prête');
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        console.log('❌ [DEBUG] Timeout atteint');
        reject(new Error('Timeout lors du chargement de la page'));
      } else {
        setTimeout(checkReady, 100);
      }
    }
    
    checkReady();
  });
}

// Écouter les messages de la popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔍 [DEBUG] Message reçu:', request.action);
  
  if (request.action === 'scanPage') {
    console.log('🔍 [DEBUG] Début du scan de page');
    
    // Attendre que la page soit chargée avant d'extraire
    waitForPageLoad().then(async () => {
      console.log('🔍 [DEBUG] Page chargée, début de l\'extraction');
      const result = await extractFileData();
      console.log('🔍 [DEBUG] Résultat de l\'extraction:', result);
      sendResponse(result);
    }).catch(error => {
      console.error('❌ [DEBUG] Erreur lors de l\'attente:', error);
      sendResponse({
        success: false,
        error: error.message,
        count: 0,
        data: []
      });
    });
    
  } else if (request.action === 'getFolders') {
    console.log('🔍 [DEBUG] Début de l\'extraction des dossiers');
    
    // Extraire les liens vers les dossiers
    waitForPageLoad().then(() => {
      const result = extractFolderLinks();
      console.log('🔍 [DEBUG] Résultat extraction dossiers:', result);
      sendResponse(result);
    }).catch(error => {
      console.error('❌ [DEBUG] Erreur extraction dossiers:', error);
      sendResponse({
        success: false,
        error: error.message,
        folders: [],
        folderData: []
      });
    });
    
  } else if (request.action === 'exportCSV') {
    console.log('🔍 [DEBUG] Début de l\'export CSV');
    
    try {
      // Utiliser les données passées en paramètre ou les données extraites localement
      const dataToExport = request.data || extractedData;
      console.log('🔍 [DEBUG] Données à exporter:', dataToExport?.length);
      
      if (!dataToExport || dataToExport.length === 0) {
        console.log('❌ [DEBUG] Aucune donnée à exporter');
        sendResponse({ success: false, error: 'Aucune donnée à exporter. Veuillez d\'abord scanner la page.' });
        return;
      }
      
      const csvContent = generateCSV(dataToExport, request.columns);
      if (!csvContent) {
        console.log('❌ [DEBUG] Erreur génération CSV');
        sendResponse({ success: false, error: 'Erreur lors de la génération du CSV.' });
        return;
      }
      
      // Créer un nom de fichier avec la date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      
      // Ajouter un indicateur si c'est un scan récursif
      const isRecursive = dataToExport.some(item => item.depth > 0);
      const recursiveIndicator = isRecursive ? '_recursive' : '';
      const filename = `bontaz_files${recursiveIndicator}_${dateStr}_${timeStr}.csv`;
      
      downloadCSV(csvContent, filename);
      console.log('✅ [DEBUG] Export réussi');
      sendResponse({ 
        success: true, 
        filename: filename,
        totalFiles: dataToExport.length,
        isRecursive: isRecursive
      });
    } catch (error) {
      console.error('❌ [DEBUG] Erreur lors de l\'export:', error);
      sendResponse({ success: false, error: error.message });
    }
    
  } else if (request.action === 'getCurrentPath') {
    console.log('🔍 [DEBUG] Récupération du chemin actuel');
    
    // Retourner le chemin actuel
    try {
      const path = getCurrentFolderPath();
      console.log('🔍 [DEBUG] Chemin actuel:', path);
      sendResponse({
        success: true,
        path: path,
        url: window.location.href
      });
    } catch (error) {
      console.error('❌ [DEBUG] Erreur chemin actuel:', error);
      sendResponse({
        success: false,
        error: error.message,
        path: '',
        url: window.location.href
      });
    }
  }
  
  return true; // Indique que la réponse sera asynchrone
});