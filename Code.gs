/**
 * RÉCEPTION HACCP — Lycée St Vincent de Paul (Soissons) — script Google, version 2.3
 *
 * INSTALLATION OU MISE À JOUR
 * 1) Collez ce fichier à la place de tout le contenu de "Code.gs", puis enregistrez.
 * 2) Menu de gauche : "Services" (+) > "Drive API" > Ajouter.
 *    (Sert à lire le texte des étiquettes et aux vignettes du registre PDF.)
 * 3) Choisissez la fonction "installer" en haut et cliquez sur Exécuter (acceptez les autorisations).
 *    Elle ajoute ce qui manque sans rien effacer, et programme les tâches automatiques.
 * 4) Déployer > Gérer les déploiements > crayon > Version : "Nouvelle version" > Déployer.
 *    (L'adresse /exec ne change pas.)
 */

var VERSION = '2.3';

var ONGLET_RECEPTIONS = 'Réceptions';
var ONGLET_RELEVES = 'Relevés frigos';
var ONGLET_ENCEINTES = 'Frigos et chambres froides';
var ONGLET_AGENTS = 'Agents';
var ONGLET_FOURNISSEURS = 'Fournisseurs';
var ONGLET_TYPES = 'Types de produit';
var ONGLET_REGLAGES = 'Réglages';
var DOSSIER_PHOTOS = 'HACCP - Photos étiquettes';
var DOSSIER_REGISTRES = 'HACCP - Registres PDF';

var COLONNES = [
  'ID', 'Date et heure', 'Réceptionné par', 'Fournisseur', 'Type de produit',
  'Température (°C)', 'Contrôle température', 'Conformité', 'Motif non-conformité',
  'Remarque', 'Photo étiquette', 'ID photo', 'Traitement', 'Commentaire traitement',
  'Traité par', 'Date traitement', 'ID photo bon de livraison', 'Texte lu sur les étiquettes', 'Corrections'
];
var C = {}; COLONNES.forEach(function (n, i) { C[n] = i; });

var COL_RELEVES = ['ID', 'Date et heure', 'Frigo / chambre froide', 'Température (°C)', 'Contrôle', 'Relevé par', 'Action corrective'];
var R = {}; COL_RELEVES.forEach(function (n, i) { R[n] = i; });

var REGLAGES_DEFAUT = [
  ['code_acces', null, 'Code à saisir une fois sur chaque tablette ou téléphone'],
  ['code_responsable', null, "Code de l'espace responsable dans l'appli"],
  ['code_utilisateur', '0000', "Code demandé pour corriger une saisie (le nom de la personne et l'ancienne valeur sont gardés)"],
  ['etablissement', 'Lycée St Vincent de Paul — Soissons', "Nom affiché dans l'appli et sur le registre PDF"],
  ['email_responsable', '', 'Adresse(s) qui reçoivent les e-mails, séparées par des virgules. Vide = aucun e-mail'],
  ['mail_soir', 'Oui', 'Chaque soir vers 18 h : non-conformités pas traitées et relevés manquants (seulement s\'il y en a)'],
  ['mail_lundi', 'Oui', 'Chaque lundi vers 7 h : résumé de la semaine'],
  ['alerte_immediate', 'Oui', 'E-mail tout de suite quand une température est hors norme ou une livraison non conforme']
];

/* ================================================================ installation */

function installer() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var r = onglet_(ss, ONGLET_RECEPTIONS);
  entetes_(r, COLONNES);
  r.getRange('B:B').setNumberFormat('dd/mm/yyyy HH:mm');
  r.getRange('P:P').setNumberFormat('dd/mm/yyyy HH:mm');

  var rel = onglet_(ss, ONGLET_RELEVES);
  entetes_(rel, COL_RELEVES);
  rel.getRange('B:B').setNumberFormat('dd/mm/yyyy HH:mm');

  var e = onglet_(ss, ONGLET_ENCEINTES);
  if (e.getLastRow() === 0) {
    entetes_(e, ['Nom', 'Idéal : max (°C)', 'Limite : max (°C)', 'Actif']);
    e.appendRow(['Chambre froide positive', 3, 4, 'Oui']);
    e.appendRow(['Chambre froide négative', -18, -15, 'Oui']);
    e.appendRow(['Réfrigérateur du self', 4, 4, 'Oui']);
    e.setColumnWidth(1, 220);
  }

  var a = onglet_(ss, ONGLET_AGENTS);
  if (a.getLastRow() === 0) {
    entetes_(a, ['Nom', 'Actif']);
    ['Maxime', 'Chloé', 'Ophélie', 'Léa'].forEach(function (x) { a.appendRow([x, 'Oui']); });
  }

  var f = onglet_(ss, ONGLET_FOURNISSEURS);
  if (f.getLastRow() === 0) entetes_(f, ['Nom', 'Actif']);

  var t = onglet_(ss, ONGLET_TYPES);
  if (t.getLastRow() === 0) {
    entetes_(t, ['Type de produit', 'Température obligatoire', 'Idéal : max (°C)', 'Limite : max (°C)', 'Explication']);
    t.appendRow(['Fruits & Légumes', 'Non', '', '', 'Température facultative']);
    t.appendRow(['Frais / Viande / Poisson', 'Oui', 4, 4, 'Au-dessus de +4 °C : hors norme']);
    t.appendRow(['Surgelé', 'Oui', -18, -15, 'Entre -18 et -15 °C : tolérance. Au-dessus de -15 °C : hors norme']);
    t.appendRow(['Épicerie / Sec', 'Non', '', '', 'Pas de température']);
    t.setColumnWidth(1, 190); t.setColumnWidth(5, 380);
  }

  var g = onglet_(ss, ONGLET_REGLAGES);
  if (g.getLastRow() === 0) entetes_(g, ['Réglage', 'Valeur', 'À quoi ça sert']);
  REGLAGES_DEFAUT.forEach(function (d) {
    if (ligneReglage_(g, d[0])) return;
    var v = d[1];
    if (d[0] === 'code_acces') v = codeAleatoire_(6);
    if (d[0] === 'code_responsable') v = String(1000 + Math.floor(Math.random() * 9000));
    g.appendRow([d[0], v, d[2]]);
  });
  g.setColumnWidth(1, 160); g.setColumnWidth(2, 260); g.setColumnWidth(3, 480);

  dossier_(DOSSIER_PHOTOS);
  dossier_(DOSSIER_REGISTRES);
  programmerTaches_();
  SpreadsheetApp.flush();

  var ocr = typeof Drive !== 'undefined' ? 'activée' : 'DÉSACTIVÉE (ajoutez le service "Drive API")';
  Logger.log('Installation v' + VERSION + ' terminée. Lecture des étiquettes : ' + ocr +
             '. Code d\'accès : ' + reglage_('code_acces') + ' / Code responsable : ' + reglage_('code_responsable'));
}

function programmerTaches_() {
  var voulues = ['tacheLectureEtiquettes', 'tacheMailSoir', 'tacheMailLundi', 'tacheRegistreMensuel'];
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (voulues.indexOf(tr.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(tr);
  });
  ScriptApp.newTrigger('tacheLectureEtiquettes').timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger('tacheMailSoir').timeBased().everyDays(1).atHour(18).create();
  ScriptApp.newTrigger('tacheMailLundi').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).create();
  ScriptApp.newTrigger('tacheRegistreMensuel').timeBased().onMonthDay(1).atHour(6).create();
}

/* ================================================================ web app */

function doGet(e) {
  return repondre_(function () {
    var p = e.parameter || {};
    verifierCle_(p.cle);
    if (p.action === 'photo') return lirePhoto_(p.id);
    return donneesInitiales_();
  });
}

function doPost(e) {
  return repondre_(function () {
    var d = JSON.parse(e.postData.contents);
    verifierCle_(d.cle);
    switch (d.action) {
      case 'ajouter': return ajouterReception_(d.reception);
      case 'releve': return ajouterReleve_(d.releve);
      case 'traiter': return traiter_(d);
      case 'modifier': return modifier_(d);
      case 'responsable': verifierResponsable_(d.code); return { ok: true };
      case 'config': verifierResponsable_(d.code); return { ok: true, config: configResponsable_() };
      case 'setConfig': verifierResponsable_(d.code); return { ok: true, config: enregistrerConfig_(d.config || {}) };
      case 'enceintes': verifierResponsable_(d.code); return { ok: true, enceintes: enregistrerEnceintes_(d.liste || []) };
      case 'listes': return modifierListe_(d);
      case 'testMail': verifierResponsable_(d.code); return { ok: true, envoye: envoyerMail_('Test — Réception HACCP', '<p>Les e-mails du registre de réception arrivent bien à cette adresse.</p>' + etatDuJour_()) };
      case 'registre': var rg = genererRegistre_(Number(d.annee), Number(d.mois)); return { ok: true, registre: { url: rg.url, nom: rg.nom } };
      default: throw new Error('Action inconnue');
    }
  });
}

function repondre_(fn) {
  var out;
  try { out = fn(); if (out.ok === undefined) out.ok = true; }
  catch (err) { out = { ok: false, erreur: String(err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ================================================================ lecture */

function donneesInitiales_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var limite = new Date(); limite.setMonth(limite.getMonth() - 13);
  var receptions = lignes_(ONGLET_RECEPTIONS, COLONNES.length)
    .filter(function (l) { return l[C['ID']] && dateDe_(l[C['Date et heure']]) >= limite; })
    .map(versObjet_).reverse();
  var lim2 = new Date(); lim2.setDate(lim2.getDate() - 120);
  var releves = lignes_(ONGLET_RELEVES, COL_RELEVES.length)
    .filter(function (l) { return l[R['ID']] && dateDe_(l[R['Date et heure']]) >= lim2; })
    .map(releveObjet_).reverse();
  return {
    version: VERSION,
    etablissement: reglage_('etablissement'),
    sheetUrl: ss.getUrl(),
    agents: liste_(ONGLET_AGENTS),
    fournisseurs: liste_(ONGLET_FOURNISSEURS),
    types: types_(),
    enceintes: enceintes_(false),
    receptions: receptions,
    releves: releves
  };
}

function versObjet_(l) {
  var ids = String(l[C['ID photo']] || '').split(/[,\s]+/).filter(String);
  return {
    id: String(l[C['ID']]),
    date: iso_(l[C['Date et heure']]),
    agent: l[C['Réceptionné par']],
    fournisseur: l[C['Fournisseur']],
    type: l[C['Type de produit']],
    temperature: l[C['Température (°C)']] === '' ? null : Number(l[C['Température (°C)']]),
    controleTemp: l[C['Contrôle température']],
    conformite: l[C['Conformité']],
    motif: l[C['Motif non-conformité']],
    remarque: l[C['Remarque']],
    photoIds: ids,
    photoBon: String(l[C['ID photo bon de livraison']] || ''),
    ocr: String(l[C['Texte lu sur les étiquettes']] || '').slice(0, 3000),
    corrections: String(l[C['Corrections']] || ''),
    traitement: l[C['Traitement']],
    commentaireTraitement: l[C['Commentaire traitement']],
    traitePar: l[C['Traité par']],
    dateTraitement: iso_(l[C['Date traitement']])
  };
}

function releveObjet_(l) {
  return {
    id: String(l[R['ID']]), date: iso_(l[R['Date et heure']]), enceinte: l[R['Frigo / chambre froide']],
    temperature: l[R['Température (°C)']] === '' ? null : Number(l[R['Température (°C)']]),
    controle: l[R['Contrôle']], agent: l[R['Relevé par']], action: l[R['Action corrective']]
  };
}

function liste_(nom) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues()
    .filter(function (r) { return r[0] !== '' && String(r[1]).toLowerCase() !== 'non'; })
    .map(function (r) { return String(r[0]).trim(); });
}

function types_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_TYPES);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues()
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) {
      return { nom: String(r[0]).trim(), obligatoire: String(r[1]).toLowerCase() === 'oui',
               ideal: r[2] === '' ? null : Number(r[2]), limite: r[3] === '' ? null : Number(r[3]) };
    });
}

function enceintes_(toutes) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_ENCEINTES);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues()
    .filter(function (r) { return r[0] !== '' && (toutes || String(r[3]).toLowerCase() !== 'non'); })
    .map(function (r) {
      return { nom: String(r[0]).trim(), ideal: r[1] === '' ? null : Number(r[1]),
               limite: r[2] === '' ? null : Number(r[2]), actif: String(r[3]).toLowerCase() !== 'non' };
    });
}

function lirePhoto_(id) {
  if (!id) throw new Error('Photo absente');
  var b = DriveApp.getFileById(id).getBlob();
  return { mime: b.getContentType(), data: Utilities.base64Encode(b.getBytes()) };
}

/* ================================================================ écriture */

function ajouterReception_(r) {
  if (!r || !r.id) throw new Error('Saisie incomplète');
  if (!r.agent || !r.fournisseur || !r.type) throw new Error('Il manque le nom, le fournisseur ou le type de produit');
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  var ligne;
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_RECEPTIONS);
    if (trouverLigne_(sh, r.id)) return { ok: true, doublon: true }; // déjà reçue (renvoi après coupure)

    var date = r.date ? new Date(r.date) : new Date();
    var photos = (r.photos && r.photos.length) ? r.photos : (r.photo ? [r.photo] : []);
    var base = Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd_HH'h'mm") + '_' + nettoyer_(r.fournisseur) + '_' + nettoyer_(r.type);
    var ids = [], urls = [];
    photos.forEach(function (p, i) {
      var fichier = enregistrerPhoto_(p, date, base + (photos.length > 1 ? '_' + (i + 1) : '') + '.jpg');
      ids.push(fichier.getId()); urls.push(fichier.getUrl());
    });
    var bonId = '';
    if (r.photoBon) { var fb = enregistrerPhoto_(r.photoBon, date, base + '_bon-de-livraison.jpg'); bonId = fb.getId(); urls.push(fb.getUrl()); }

    ligne = new Array(COLONNES.length).fill('');
    ligne[C['ID']] = r.id;
    ligne[C['Date et heure']] = date;
    ligne[C['Réceptionné par']] = r.agent;
    ligne[C['Fournisseur']] = r.fournisseur;
    ligne[C['Type de produit']] = r.type;
    ligne[C['Température (°C)']] = (r.temperature === null || r.temperature === undefined || r.temperature === '') ? '' : Number(r.temperature);
    ligne[C['Contrôle température']] = r.controleTemp || '';
    ligne[C['Conformité']] = r.conformite;
    ligne[C['Motif non-conformité']] = r.motif || '';
    ligne[C['Remarque']] = r.remarque || '';
    ligne[C['Photo étiquette']] = urls.join('\n');
    ligne[C['ID photo']] = ids.join(',');
    ligne[C['ID photo bon de livraison']] = bonId;
    sh.appendRow(ligne);
    if (r.conformite === 'Non conforme') sh.getRange(sh.getLastRow(), 1, 1, COLONNES.length).setBackground('#fde2df');

    var fs = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_FOURNISSEURS);
    if (fs) {
      var noms = fs.getLastRow() > 1 ? fs.getRange(2, 1, fs.getLastRow() - 1, 1).getValues().map(function (x) { return String(x[0]).trim(); }) : [];
      if (noms.indexOf(String(r.fournisseur).trim()) < 0) fs.appendRow([String(r.fournisseur).trim(), 'Oui']);
    }
  } finally { lock.releaseLock(); }

  if (r.conformite === 'Non conforme' || r.controleTemp === 'Hors norme') alerte_(
    'Livraison non conforme — ' + r.fournisseur,
    '<p><b>' + esc_(r.fournisseur) + '</b> · ' + esc_(r.type) + '<br>Température : ' + temp_(ligne[C['Température (°C)']]) +
    ' (' + esc_(r.controleTemp || '—') + ')<br>Motif : ' + esc_(r.motif || '—') + (r.remarque ? '<br>Remarque : ' + esc_(r.remarque) : '') +
    '<br>Reçu par ' + esc_(r.agent) + ' le ' + dateTxt_(ligne[C['Date et heure']]) + '</p><p>À traiter dans l\'appli : accepter ou refuser.</p>');
  return { ok: true, reception: versObjet_(ligne) };
}

function enregistrerPhoto_(dataUrl, date, nom) {
  var m = String(dataUrl).match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!m) throw new Error('Photo illisible');
  return sousDossierMois_(date).createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nom));
}

function ajouterReleve_(r) {
  if (!r || !r.id || !r.enceinte || r.temperature === null || r.temperature === undefined) throw new Error('Relevé incomplet');
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  var ligne;
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_RELEVES);
    if (!sh) throw new Error('Lancez de nouveau la fonction installer (onglet des relevés manquant)');
    if (trouverLigne_(sh, r.id)) return { ok: true, doublon: true };
    ligne = [r.id, r.date ? new Date(r.date) : new Date(), r.enceinte, Number(r.temperature), r.controle || '', r.agent || '', r.action || ''];
    sh.appendRow(ligne);
    if (r.controle === 'Hors norme') sh.getRange(sh.getLastRow(), 1, 1, COL_RELEVES.length).setBackground('#fde2df');
  } finally { lock.releaseLock(); }
  if (r.controle === 'Hors norme') alerte_('Température hors norme — ' + r.enceinte,
    '<p><b>' + esc_(r.enceinte) + '</b> : ' + temp_(r.temperature) + '<br>Relevé par ' + esc_(r.agent) + ' le ' + dateTxt_(ligne[1]) +
    '<br>Action : ' + esc_(r.action || 'non renseignée') + '</p>');
  return { ok: true, releve: releveObjet_(ligne) };
}

function traiter_(d) {
  if (!d.traitement || !d.par) throw new Error('Indiquez la décision et votre nom');
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_RECEPTIONS);
    var row = trouverLigne_(sh, d.id);
    if (!row) throw new Error('Livraison introuvable');
    sh.getRange(row, C['Traitement'] + 1, 1, 4).setValues([[d.traitement, d.commentaire || '', d.par || '', new Date()]]);
    sh.getRange(row, 1, 1, COLONNES.length).setBackground(d.traitement === 'Marchandise refusée' ? '#f4d6d2' : '#e3f1e4');
    return { ok: true, reception: versObjet_(sh.getRange(row, 1, 1, COLONNES.length).getValues()[0]) };
  } finally { lock.releaseLock(); }
}

// Correction d'une saisie : on garde l'ancienne valeur, le nom et l'heure dans la colonne "Corrections"
function modifier_(d) {
  var codeU = reglage_('code_utilisateur') || '0000';
  var c = String(d.code || '').trim();
  if (c !== codeU && c !== reglage_('code_responsable')) throw new Error('Code incorrect');
  if (!d.par) throw new Error('Indiquez votre nom');
  var ch = d.champs || {};
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_RECEPTIONS);
    var row = trouverLigne_(sh, d.id);
    if (!row) throw new Error('Livraison introuvable');
    var l = sh.getRange(row, 1, 1, COLONNES.length).getValues()[0];
    var map = { fournisseur: 'Fournisseur', type: 'Type de produit', temperature: 'Température (°C)', controleTemp: 'Contrôle température',
                conformite: 'Conformité', motif: 'Motif non-conformité', remarque: 'Remarque' };
    var lib = { fournisseur: 'fournisseur', type: 'produit', temperature: 'température', conformite: 'conformité', motif: 'motif', remarque: 'remarque' };
    var diffs = [];
    Object.keys(map).forEach(function (k) {
      if (ch[k] === undefined) return;
      var col = C[map[k]], avant = l[col];
      var apres = k === 'temperature' ? (ch[k] === null || ch[k] === '' ? '' : Number(ch[k])) : String(ch[k]);
      if (String(avant) === String(apres)) return;
      l[col] = apres;
      if (lib[k]) diffs.push(lib[k] + ' : ' + (k === 'temperature' ? temp_(avant) + ' → ' + temp_(apres) : '« ' + (avant || '—') + ' » → « ' + (apres || '—') + ' »'));
    });
    if (!diffs.length) return { ok: true, reception: versObjet_(l), inchange: true };
    var trace = dateTxt_(new Date()) + ' — ' + d.par + ' : ' + diffs.join(' ; ');
    l[C['Corrections']] = (l[C['Corrections']] ? l[C['Corrections']] + '\n' : '') + trace;
    if (l[C['Conformité']] !== 'Non conforme') { l[C['Traitement']] = ''; l[C['Commentaire traitement']] = ''; l[C['Traité par']] = ''; l[C['Date traitement']] = ''; }
    sh.getRange(row, 1, 1, COLONNES.length).setValues([l]);
    sh.getRange(row, 1, 1, COLONNES.length).setBackground(l[C['Conformité']] === 'Non conforme' ? (l[C['Traitement']] ? '#f4d6d2' : '#fde2df') : null);
    return { ok: true, reception: versObjet_(l) };
  } finally { lock.releaseLock(); }
}

function modifierListe_(d) {
  verifierResponsable_(d.code);
  var nom = d.liste === 'agents' ? ONGLET_AGENTS : d.liste === 'fournisseurs' ? ONGLET_FOURNISSEURS : null;
  if (!nom) throw new Error('Liste inconnue');
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom);
  var actuels = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues() : [];
  var voulus = (d.valeurs || []).map(function (v) { return String(v).trim(); }).filter(String);
  var vus = {};
  actuels.forEach(function (r) { vus[String(r[0]).trim()] = true; r[1] = voulus.indexOf(String(r[0]).trim()) >= 0 ? 'Oui' : 'Non'; });
  voulus.forEach(function (v) { if (!vus[v]) actuels.push([v, 'Oui']); });
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).clearContent();
  if (actuels.length) sh.getRange(2, 1, actuels.length, 2).setValues(actuels);
  return { ok: true, valeurs: liste_(nom) };
}

function enregistrerEnceintes_(liste) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_ENCEINTES);
  var rows = liste.filter(function (x) { return x && String(x.nom || '').trim(); }).map(function (x) {
    return [String(x.nom).trim(), x.ideal === null || x.ideal === '' || isNaN(x.ideal) ? '' : Number(x.ideal),
            x.limite === null || x.limite === '' || isNaN(x.limite) ? '' : Number(x.limite), x.actif === false ? 'Non' : 'Oui'];
  });
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 4).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, 4).setValues(rows);
  return enceintes_(true);
}

function configResponsable_() {
  return {
    emails: reglage_('email_responsable'),
    mailSoir: reglage_('mail_soir').toLowerCase() !== 'non',
    mailLundi: reglage_('mail_lundi').toLowerCase() !== 'non',
    alerteImmediate: reglage_('alerte_immediate').toLowerCase() !== 'non',
    codeUtilisateur: reglage_('code_utilisateur'),
    enceintes: enceintes_(true)
  };
}

function enregistrerConfig_(c) {
  if (c.emails !== undefined) {
    var em = String(c.emails).split(/[,;\s]+/).filter(String);
    em.forEach(function (x) { if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)) throw new Error('Adresse e-mail invalide : ' + x); });
    ecrireReglage_('email_responsable', em.join(', '));
  }
  if (c.mailSoir !== undefined) ecrireReglage_('mail_soir', c.mailSoir ? 'Oui' : 'Non');
  if (c.mailLundi !== undefined) ecrireReglage_('mail_lundi', c.mailLundi ? 'Oui' : 'Non');
  if (c.alerteImmediate !== undefined) ecrireReglage_('alerte_immediate', c.alerteImmediate ? 'Oui' : 'Non');
  if (c.codeUtilisateur !== undefined) {
    var cu = String(c.codeUtilisateur).trim();
    if (!/^[0-9A-Za-z]{4,8}$/.test(cu)) throw new Error('Le code utilisateur doit faire 4 à 8 chiffres ou lettres');
    ecrireReglage_('code_utilisateur', cu);
  }
  return configResponsable_();
}

/* ================================================================ lecture automatique des étiquettes */

function tacheLectureEtiquettes() {
  if (typeof Drive === 'undefined') return; // service Drive API pas ajouté
  var lock = LockService.getScriptLock(); if (!lock.tryLock(1000)) return;
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_RECEPTIONS);
    var n = sh.getLastRow() - 1; if (n < 1) return;
    var debut = Date.now();
    var v = sh.getRange(2, 1, n, COLONNES.length).getValues();
    for (var i = v.length - 1; i >= 0 && Date.now() - debut < 4 * 60 * 1000; i--) {
      var ids = String(v[i][C['ID photo']] || '').split(/[,\s]+/).filter(String);
      if (v[i][C['ID photo bon de livraison']]) ids.push(String(v[i][C['ID photo bon de livraison']]));
      if (!ids.length || v[i][C['Texte lu sur les étiquettes']] !== '') continue;
      var textes = [];
      ids.forEach(function (id) { try { textes.push(lireTexte_(id)); } catch (e) { } });
      var txt = textes.join('\n').replace(/\s+\n/g, '\n').trim().slice(0, 5000) || '(rien de lisible)';
      sh.getRange(i + 2, C['Texte lu sur les étiquettes'] + 1).setValue(txt);
    }
  } finally { lock.releaseLock(); }
}

function lireTexte_(id) {
  var blob = DriveApp.getFileById(id).getBlob();
  var doc;
  if (Drive.Files.create) doc = Drive.Files.create({ name: 'lecture-temp', mimeType: 'application/vnd.google-apps.document' }, blob, { ocrLanguage: 'fr', fields: 'id' });
  else doc = Drive.Files.insert({ title: 'lecture-temp', mimeType: 'application/vnd.google-apps.document' }, blob, { ocr: true, ocrLanguage: 'fr' });
  try { return DocumentApp.openById(doc.id).getBody().getText(); }
  finally { DriveApp.getFileById(doc.id).setTrashed(true); }
}

/* ================================================================ e-mails */

function envoyerMail_(sujet, html, pj) {
  var to = reglage_('email_responsable');
  if (!to) return false;
  MailApp.sendEmail({ to: to, subject: '[HACCP] ' + sujet, name: 'Réception HACCP', attachments: pj || [],
    htmlBody: '<div style="font-family:Arial,sans-serif;font-size:14px;color:#231f20">' + html +
      '<p style="color:#888;font-size:12px">' + esc_(reglage_('etablissement')) + ' — <a href="' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + '">ouvrir le registre</a></p></div>' });
  return true;
}

function alerte_(sujet, html) {
  try { if (reglage_('alerte_immediate').toLowerCase() !== 'non') envoyerMail_(sujet, html); } catch (e) { }
}

function tacheMailSoir() {
  if (reglage_('mail_soir').toLowerCase() === 'non' || !reglage_('email_responsable')) return;
  var auj = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var jourDe = function (d) { return Utilities.formatDate(dateDe_(d), Session.getScriptTimeZone(), 'yyyy-MM-dd'); };
  var nc = lignes_(ONGLET_RECEPTIONS, COLONNES.length).filter(function (l) { return l[C['ID']] && l[C['Conformité']] === 'Non conforme' && !l[C['Traitement']]; });
  var rel = lignes_(ONGLET_RELEVES, COL_RELEVES.length).filter(function (l) { return l[R['ID']] && jourDe(l[R['Date et heure']]) === auj; });
  var faits = {}; rel.forEach(function (l) { faits[l[R['Frigo / chambre froide']]] = true; });
  var manquants = enceintes_(false).filter(function (e) { return !faits[e.nom]; }).map(function (e) { return e.nom; });
  var hors = rel.filter(function (l) { return l[R['Contrôle']] === 'Hors norme'; });
  var estJourOuvre = [0, 6].indexOf(new Date().getDay()) < 0;
  if (!nc.length && !hors.length && !(estJourOuvre && manquants.length)) return;
  var h = '<h2 style="margin:0 0 8px">Point du soir</h2>';
  if (nc.length) h += '<p><b>' + nc.length + ' non-conformité(s) à traiter :</b></p><ul>' + nc.map(function (l) {
    return '<li>' + dateTxt_(l[C['Date et heure']]) + ' — ' + esc_(l[C['Fournisseur']]) + ' (' + esc_(l[C['Type de produit']]) + ') : ' + esc_(l[C['Motif non-conformité']] || '—') + '</li>'; }).join('') + '</ul>';
  if (hors.length) h += '<p><b>Températures hors norme aujourd\'hui :</b></p><ul>' + hors.map(function (l) {
    return '<li>' + esc_(l[R['Frigo / chambre froide']]) + ' : ' + temp_(l[R['Température (°C)']]) + ' — action : ' + esc_(l[R['Action corrective']] || 'non renseignée') + '</li>'; }).join('') + '</ul>';
  if (estJourOuvre && manquants.length) h += '<p><b>Relevé pas fait aujourd\'hui :</b> ' + manquants.map(esc_).join(', ') + '</p>';
  envoyerMail_('Point du soir — ' + (nc.length ? nc.length + ' à traiter' : 'à vérifier'), h);
}

function tacheMailLundi() {
  if (reglage_('mail_lundi').toLowerCase() === 'non' || !reglage_('email_responsable')) return;
  var fin = new Date(); fin.setHours(0, 0, 0, 0);
  var debut = new Date(fin); debut.setDate(debut.getDate() - 7);
  var L = lignes_(ONGLET_RECEPTIONS, COLONNES.length).filter(function (l) { var d = dateDe_(l[C['Date et heure']]); return l[C['ID']] && d >= debut && d < fin; });
  var Rl = lignes_(ONGLET_RELEVES, COL_RELEVES.length).filter(function (l) { var d = dateDe_(l[R['Date et heure']]); return l[R['ID']] && d >= debut && d < fin; });
  var nc = L.filter(function (l) { return l[C['Conformité']] === 'Non conforme'; });
  var hors = L.filter(function (l) { return l[C['Contrôle température']] === 'Hors norme'; }).length + Rl.filter(function (l) { return l[R['Contrôle']] === 'Hors norme'; }).length;
  var parF = {}; nc.forEach(function (l) { parF[l[C['Fournisseur']]] = (parF[l[C['Fournisseur']]] || 0) + 1; });
  var h = '<h2 style="margin:0 0 8px">Semaine du ' + dateCourte_(debut) + ' au ' + dateCourte_(new Date(fin.getTime() - 86400000)) + '</h2>' +
    '<table cellpadding="6" style="border-collapse:collapse">' +
    '<tr><td>Livraisons reçues</td><td><b>' + L.length + '</b></td></tr>' +
    '<tr><td>Livraisons conformes</td><td><b>' + (L.length ? Math.round((L.length - nc.length) / L.length * 100) + ' %' : '—') + '</b></td></tr>' +
    '<tr><td>Non-conformités</td><td><b>' + nc.length + '</b> (dont ' + nc.filter(function (l) { return !l[C['Traitement']]; }).length + ' pas traitée(s))</td></tr>' +
    '<tr><td>Relevés de frigos</td><td><b>' + Rl.length + '</b></td></tr>' +
    '<tr><td>Températures hors norme</td><td><b>' + hors + '</b></td></tr></table>';
  var f = Object.keys(parF);
  if (f.length) h += '<p><b>Non-conformités par fournisseur :</b> ' + f.map(function (k) { return esc_(k) + ' (' + parF[k] + ')'; }).join(', ') + '</p>';
  envoyerMail_('Résumé de la semaine', h);
}

/* ================================================================ registre PDF */

function etatDuJour_() {
  var tz = Session.getScriptTimeZone(), auj = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var jourDe = function (v) { return Utilities.formatDate(dateDe_(v), tz, 'yyyy-MM-dd'); };
  var L = lignes_(ONGLET_RECEPTIONS, COLONNES.length).filter(function (l) { return l[C['ID']] && jourDe(l[C['Date et heure']]) === auj; });
  var Rl = lignes_(ONGLET_RELEVES, COL_RELEVES.length).filter(function (l) { return l[R['ID']] && jourDe(l[R['Date et heure']]) === auj; });
  var nc = lignes_(ONGLET_RECEPTIONS, COLONNES.length).filter(function (l) { return l[C['ID']] && l[C['Conformité']] === 'Non conforme' && !l[C['Traitement']]; });
  return '<h3 style="margin:16px 0 6px">État du registre aujourd\'hui</h3><ul>' +
    '<li>Livraisons reçues aujourd\'hui : <b>' + L.length + '</b></li>' +
    '<li>Relevés de frigos aujourd\'hui : <b>' + Rl.length + '</b>' + (Rl.length ? ' (' + Rl.map(function (l) { return esc_(l[R['Frigo / chambre froide']]) + ' ' + temp_(l[R['Température (°C)']]); }).join(', ') + ')' : '') + '</li>' +
    '<li>Non-conformités à traiter : <b>' + nc.length + '</b></li></ul>';
}

function tacheRegistreMensuel() {
  var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  var reg = genererRegistre_(d.getFullYear(), d.getMonth() + 1);
  envoyerMail_('Registre de ' + reg.libelle, '<p>Le registre du mois est en pièce jointe et rangé dans Drive : <a href="' + reg.url + '">' + esc_(reg.nom) + '</a></p>' + reg.resume, [reg.blob]);
}

function genererRegistre_(annee, mois) {
  if (!annee || !mois) throw new Error('Mois manquant');
  var debut = new Date(annee, mois - 1, 1), fin = new Date(annee, mois, 1);
  var libelle = Utilities.formatDate(debut, Session.getScriptTimeZone(), 'MMMM yyyy');
  var moisFr = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  libelle = moisFr[mois - 1] + ' ' + annee;
  var L = lignes_(ONGLET_RECEPTIONS, COLONNES.length).filter(function (l) { var d = dateDe_(l[C['Date et heure']]); return l[C['ID']] && d >= debut && d < fin; });
  var Rl = lignes_(ONGLET_RELEVES, COL_RELEVES.length).filter(function (l) { var d = dateDe_(l[R['Date et heure']]); return l[R['ID']] && d >= debut && d < fin; });
  var nc = L.filter(function (l) { return l[C['Conformité']] === 'Non conforme'; }).length;
  var token = ScriptApp.getOAuthToken(), t0 = Date.now();

  var css = 'body{font-family:Arial,sans-serif;font-size:9pt;color:#231f20}h1{font-size:16pt;margin:0}h2{font-size:12pt;margin:18px 0 6px;color:#8c1a76}' +
    'table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:3px 4px;vertical-align:top;text-align:left}th{background:#eee}' +
    '.nc{background:#fde2df}.bar{height:5px}.bar span{display:inline-block;width:25%;height:5px}img{width:70px}';
  var h = '<html><head><meta charset="utf-8"><style>' + css + '</style></head><body>' +
    '<div class="bar"><span style="background:#ed1c24"></span><span style="background:#ec008c"></span><span style="background:#9d1882"></span><span style="background:#a51724"></span></div>' +
    '<h1>Registre de réception des marchandises</h1><p>' + esc_(reglage_('etablissement')) + ' — <b>' + libelle + '</b><br>' +
    L.length + ' livraison(s), ' + nc + ' non conforme(s), ' + Rl.length + ' relevé(s) de température. Édité le ' + dateTxt_(new Date()) + '.</p>' +
    '<h2>Livraisons</h2><table><tr><th>Date</th><th>Fournisseur</th><th>Produit</th><th>T°</th><th>Conformité</th><th>Décision</th><th>Reçu par</th><th>Étiquette</th></tr>';
  L.forEach(function (l) {
    var nonConf = l[C['Conformité']] === 'Non conforme';
    var id = String(l[C['ID photo']] || '').split(/[,\s]+/).filter(String)[0];
    var img = id && Date.now() - t0 < 4 * 60 * 1000 ? vignette_(id, token) : '';
    h += '<tr' + (nonConf ? ' class="nc"' : '') + '><td>' + dateTxt_(l[C['Date et heure']]) + '</td><td>' + esc_(l[C['Fournisseur']]) + '</td><td>' + esc_(l[C['Type de produit']]) +
      '</td><td>' + temp_(l[C['Température (°C)']]) + '</td><td>' + esc_(l[C['Conformité']]) + (l[C['Motif non-conformité']] ? '<br><i>' + esc_(l[C['Motif non-conformité']]) + '</i>' : '') +
      '</td><td>' + esc_(l[C['Traitement']] || (nonConf ? 'À traiter' : '')) + (l[C['Traité par']] ? '<br>par ' + esc_(l[C['Traité par']]) : '') +
      '</td><td>' + esc_(l[C['Réceptionné par']]) + (l[C['Corrections']] ? '<br><i>corrigée</i>' : '') + '</td><td>' + (img ? '<img src="' + img + '">' : (id ? 'Photo dans Drive' : '—')) + '</td></tr>';
  });
  if (!L.length) h += '<tr><td colspan="8">Aucune livraison ce mois-ci.</td></tr>';
  h += '</table><h2>Relevés des frigos et chambres froides</h2><table><tr><th>Date</th><th>Frigo / chambre froide</th><th>T°</th><th>Contrôle</th><th>Relevé par</th><th>Action corrective</th></tr>';
  Rl.forEach(function (l) {
    h += '<tr' + (l[R['Contrôle']] === 'Hors norme' ? ' class="nc"' : '') + '><td>' + dateTxt_(l[R['Date et heure']]) + '</td><td>' + esc_(l[R['Frigo / chambre froide']]) +
      '</td><td>' + temp_(l[R['Température (°C)']]) + '</td><td>' + esc_(l[R['Contrôle']]) + '</td><td>' + esc_(l[R['Relevé par']]) + '</td><td>' + esc_(l[R['Action corrective']]) + '</td></tr>';
  });
  if (!Rl.length) h += '<tr><td colspan="6">Aucun relevé ce mois-ci.</td></tr>';
  h += '</table><p style="margin-top:24px">Visa du responsable : ______________________</p></body></html>';

  var nom = 'Registre réception HACCP - ' + annee + '-' + ('0' + mois).slice(-2) + '.pdf';
  var pdf = Utilities.newBlob(h, 'text/html', 'registre.html').getAs('application/pdf').setName(nom);
  var dossier = dossier_(DOSSIER_REGISTRES);
  var anciens = dossier.getFilesByName(nom); while (anciens.hasNext()) anciens.next().setTrashed(true);
  var f = dossier.createFile(pdf);
  var ncL = L.filter(function (l) { return l[C['Conformité']] === 'Non conforme'; });
  var horsR = Rl.filter(function (l) { return l[R['Contrôle']] === 'Hors norme'; });
  var resume = '<h3 style="margin:16px 0 6px">Résumé de ' + libelle + '</h3><ul>' +
    '<li>Livraisons reçues : <b>' + L.length + '</b>, dont <b>' + ncL.length + '</b> non conforme(s)</li>' +
    '<li>Relevés de frigos : <b>' + Rl.length + '</b>, dont <b>' + horsR.length + '</b> hors norme</li></ul>';
  if (ncL.length) resume += '<p><b>Non-conformités :</b></p><ul>' + ncL.map(function (l) {
    return '<li>' + dateTxt_(l[C['Date et heure']]) + ' — ' + esc_(l[C['Fournisseur']]) + ' (' + esc_(l[C['Type de produit']]) + ', ' + temp_(l[C['Température (°C)']]) + ') : ' +
      esc_(l[C['Motif non-conformité']] || '—') + ' → ' + esc_(l[C['Traitement']] || 'pas traitée') + '</li>'; }).join('') + '</ul>';
  if (horsR.length) resume += '<p><b>Températures de frigos hors norme :</b></p><ul>' + horsR.map(function (l) {
    return '<li>' + dateTxt_(l[R['Date et heure']]) + ' — ' + esc_(l[R['Frigo / chambre froide']]) + ' : ' + temp_(l[R['Température (°C)']]) + ' — action : ' + esc_(l[R['Action corrective']] || 'non renseignée') + '</li>'; }).join('') + '</ul>';
  return { url: f.getUrl(), nom: nom, libelle: libelle, resume: resume, blob: f.getBlob() };
}

function vignette_(id, token) {
  try {
    if (typeof Drive === 'undefined') return '';
    var lien = Drive.Files.get(id, { fields: 'thumbnailLink' }).thumbnailLink;
    if (!lien) return '';
    var rep = UrlFetchApp.fetch(lien.replace(/=s\d+$/, '=s200'), { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
    if (rep.getResponseCode() !== 200) return '';
    var b = rep.getBlob();
    return 'data:' + (b.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(b.getBytes());
  } catch (e) { return ''; }
}

/* ================================================================ outils */

function onglet_(ss, nom) { return ss.getSheetByName(nom) || ss.insertSheet(nom); }

function entetes_(sh, cols) {
  var n = sh.getLastColumn();
  var actuels = n ? sh.getRange(1, 1, 1, n).getValues()[0] : [];
  cols.forEach(function (c, i) { if (actuels[i] !== c) sh.getRange(1, i + 1).setValue(c); });
  sh.getRange(1, 1, 1, cols.length).setFontWeight('bold').setBackground('#efe6ec');
  sh.setFrozenRows(1);
}

function lignes_(nom, nbCol) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, nbCol).getValues();
}

function ligneReglage_(sh, cle) {
  if (sh.getLastRow() < 2) return 0;
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]).trim() === cle) return i + 2;
  return 0;
}

function reglage_(cle) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_REGLAGES);
  if (!sh) return '';
  var row = ligneReglage_(sh, cle);
  return row ? String(sh.getRange(row, 2).getValue()).trim() : '';
}

function ecrireReglage_(cle, valeur) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_REGLAGES);
  var row = ligneReglage_(sh, cle);
  if (row) sh.getRange(row, 2).setValue(valeur); else sh.appendRow([cle, valeur, '']);
}

function verifierCle_(cle) {
  var attendu = reglage_('code_acces');
  if (!attendu) throw new Error("Le script n'est pas installé : lancez la fonction installer");
  if (String(cle || '').trim().toUpperCase() !== attendu.toUpperCase()) throw new Error("Code d'accès incorrect");
}

function verifierResponsable_(code) {
  if (String(code || '').trim() !== reglage_('code_responsable')) throw new Error('Code responsable incorrect');
}

function trouverLigne_(sh, id) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  var ids = sh.getRange(2, 1, n, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function dossier_(nom) {
  var it = DriveApp.getFoldersByName(nom);
  return it.hasNext() ? it.next() : DriveApp.createFolder(nom);
}

function sousDossierMois_(date) {
  var parent = dossier_(DOSSIER_PHOTOS);
  var nom = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM');
  var it = parent.getFoldersByName(nom);
  return it.hasNext() ? it.next() : parent.createFolder(nom);
}

function dateDe_(v) { return v instanceof Date ? v : new Date(v); }
function iso_(v) { return v instanceof Date ? v.toISOString() : (v ? String(v) : ''); }
function dateTxt_(v) { var d = dateDe_(v); return isNaN(d) ? '' : Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'); }
function dateCourte_(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM'); }
function temp_(t) { return (t === '' || t === null || t === undefined) ? '—' : (Number(t) > 0 ? '+' : '') + String(t).replace('.', ',') + ' °C'; }
function esc_(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function nettoyer_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
}

function codeAleatoire_(n) {
  var alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', s = '';
  for (var i = 0; i < n; i++) s += alpha.charAt(Math.floor(Math.random() * alpha.length));
  return s;
}
