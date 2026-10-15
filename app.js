(function () {
  'use strict';
  const Core = globalThis.WorksheetCore;
  const $ = id => document.getElementById(id);
  let order = Core.cards.map(card => card.id);
  let selected = null;
  let dragged = null;
  let result = null;
  let solved = false;
  const answers = Object.fromEntries(Core.questions.map(q => [q.id, '']));
  let topic = '';
  let summary = '';
  const svgNS = 'http://www.w3.org/2000/svg';
  function picture(id) {
    const card = Core.cards.find(c => c.id === id);
    const [left, top, right, bottom] = card.bounds;
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `${left} ${top} ${right-left} ${bottom-top}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', card.alt);
    const image = document.createElementNS(svgNS, 'image');
    image.setAttribute('href', 'bilder.png');
    image.setAttribute('width', '1024');
    image.setAttribute('height', '1536');
    svg.append(image);
    return svg;
  }
  function button(text, label, action, id, disabled = false) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'card-button'; b.textContent = text; b.setAttribute('aria-label', label); b.dataset.action = action; b.dataset.id = id; b.disabled = disabled; return b;
  }
  function renderCards(focusId = null) {
    const grid = $('cards'); grid.replaceChildren();
    order.forEach((id, index) => {
      const li = document.createElement('li'); li.className = 'picture-card'; li.dataset.id = id; li.tabIndex = 0; li.draggable = !solved;
      li.setAttribute('aria-label', `Platz ${index+1}: Bild ${id}. Enter zum Auswählen.`);
      if (selected === id) { li.classList.add('selected'); li.setAttribute('aria-label', `Platz ${index+1}: Bild ${id}, ausgewählt. Enter auf einer zweiten Karte zum Tauschen.`); }
      if (result) li.classList.add(result.positions[index] ? 'is-correct' : 'is-wrong');
      const head = document.createElement('div'); head.className = 'card-head';
      const place = document.createElement('span'); place.textContent = `Platz ${index+1}`;
      const status = document.createElement('span'); status.className = 'card-status'; status.textContent = result ? (result.positions[index] ? '✓ Richtig' : 'Noch prüfen') : '↔'; head.append(place, status);
      const frame = document.createElement('div'); frame.className = 'picture-frame'; frame.append(picture(id));
      const actions = document.createElement('div'); actions.className = 'card-actions';
      actions.append(button('←', `Bild ${id} einen Platz zurück`, 'back', id, solved || index === 0), button('Bild vergrößern', `Bild ${id} vergrößern`, 'zoom', id), button('→', `Bild ${id} einen Platz vor`, 'forward', id, solved || index === 7));
      li.append(head, frame, actions); grid.append(li);
    });
    if (focusId) grid.querySelector(`[data-id="${focusId}"]`).focus({ preventScroll: true });
  }
  function clearCheck() { result = null; solved = false; $('order-feedback').hidden = true; $('continue').hidden = true; updateProgress(); }
  function select(id) {
    if (solved) return;
    if (selected === id) { selected = null; $('selection-feedback').textContent = 'Auswahl aufgehoben.'; }
    else if (!selected) { selected = id; $('selection-feedback').textContent = `Bild ${id} ist ausgewählt. Tippe eine zweite Karte an, um beide zu tauschen.`; }
    else { const first = selected; order = Core.swap(order, order.indexOf(first), order.indexOf(id)); selected = null; clearCheck(); $('selection-feedback').textContent = `Bilder ${first} und ${id} wurden getauscht.`; }
    renderCards(id);
  }
  function moveCard(id, to) { if (solved) return; order = Core.move(order, order.indexOf(id), to); selected = null; clearCheck(); renderCards(id); $('selection-feedback').textContent = `Bild ${id} steht jetzt an Platz ${to+1}.`; }
  $('cards').addEventListener('click', event => {
    const action = event.target.closest('button[data-action]');
    if (action) { const id = action.dataset.id; const at = order.indexOf(id); if (action.dataset.action === 'zoom') openImage(id); else moveCard(id, at + (action.dataset.action === 'back' ? -1 : 1)); return; }
    const card = event.target.closest('.picture-card'); if (card) select(card.dataset.id);
  });
  $('cards').addEventListener('keydown', event => { if (event.target.matches('.picture-card') && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); select(event.target.dataset.id); } if (event.key === 'Escape' && selected) { selected = null; renderCards(); $('selection-feedback').textContent = 'Auswahl aufgehoben.'; } });
  $('cards').addEventListener('dragstart', event => { const card = event.target.closest('.picture-card'); if (!card || solved) { event.preventDefault(); return; } dragged = card.dataset.id; event.dataTransfer.setData('text/plain', dragged); event.dataTransfer.effectAllowed = 'move'; card.classList.add('dragging'); });
  $('cards').addEventListener('dragover', event => { if (dragged && !solved) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } });
  $('cards').addEventListener('dragenter', event => { const card = event.target.closest('.picture-card'); if (card && dragged && !solved) card.classList.add('drop-target'); });
  $('cards').addEventListener('dragleave', event => { const card = event.target.closest('.picture-card'); if (card && !card.contains(event.relatedTarget)) card.classList.remove('drop-target'); });
  $('cards').addEventListener('drop', event => { event.preventDefault(); const card = event.target.closest('.picture-card'); if (card && dragged && !solved) { const id = dragged; dragged = null; moveCard(id, order.indexOf(card.dataset.id)); } });
  $('cards').addEventListener('dragend', () => { dragged = null; document.querySelectorAll('.dragging,.drop-target').forEach(el => el.classList.remove('dragging','drop-target')); });
  $('check-order').addEventListener('click', () => {
    result = Core.check(order); solved = result.solved; selected = null; renderCards();
    const feedback = $('order-feedback'); feedback.hidden = false; feedback.className = `feedback ${solved ? 'success' : 'retry'}`;
    feedback.textContent = solved ? 'Richtig geordnet! Alle acht Bilder stehen an ihrem passenden Platz.' : `${result.count} von 8 Bildern stehen schon richtig. Schau dir die markierten Plätze noch einmal an und vergleiche mit dem Text.`;
    $('selection-feedback').textContent = ''; $('continue').hidden = !solved; updateProgress();
  });
  $('shuffle').addEventListener('click', () => { order = Core.shuffle(order); selected = null; clearCheck(); renderCards(); $('selection-feedback').textContent = 'Die Bilder wurden neu gemischt. Bereits geschriebene Antworten bleiben erhalten.'; });
  function openImage(id) { $('image-title').textContent = `Bildkarte ${id}`; $('large-image').replaceChildren(picture(id)); $('image-description').textContent = Core.cards.find(c => c.id === id).alt; $('image-dialog').showModal(); }
  ['close-image','close-image-bottom'].forEach(id => $(id).addEventListener('click', () => $('image-dialog').close()));
  $('image-dialog').addEventListener('click', event => { if (event.target === $('image-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
  function buildQuestions() {
    Core.questions.forEach((q, i) => {
      const card = document.createElement('article'); card.className = 'question-card';
      const heading = document.createElement('div'); heading.className = 'question-heading'; const word = document.createElement('h3'); word.textContent = q.word; const number = document.createElement('span'); number.textContent = `${i+1} / 5`; heading.append(word, number);
      const label = document.createElement('label'); label.htmlFor = `${q.id}-answer`; label.textContent = q.prompt;
      const textarea = document.createElement('textarea'); textarea.id = `${q.id}-answer`; textarea.rows = 3; textarea.maxLength = 2000; textarea.placeholder = 'Deine Antwort … (passende Zeilenangaben ergänzen)';
      const printAnswer = document.createElement('div'); printAnswer.id = `${q.id}-print`; printAnswer.className = 'print-answer';
      const detail = document.createElement('details'); detail.className = 'hint'; const summary = document.createElement('summary'); summary.textContent = 'Eine Denkstütze öffnen'; const hint = document.createElement('p'); hint.textContent = q.hint; detail.append(summary, hint);
      const compare = document.createElement('button'); compare.type = 'button'; compare.className = 'button secondary compare'; compare.id = `${q.id}-compare`; compare.textContent = 'Antwort vergleichen'; compare.disabled = true; compare.setAttribute('aria-expanded', 'false'); compare.setAttribute('aria-controls', `${q.id}-model`);
      const model = document.createElement('div'); model.className = 'model-answer'; model.id = `${q.id}-model`; model.hidden = true;
      const modelLabel = document.createElement('p'); modelLabel.className = 'model-label'; modelLabel.textContent = 'Vergleichsantwort · Andere passende Formulierungen sind möglich';
      const example = document.createElement('p'); example.textContent = q.model;
      const checkLabel = document.createElement('p'); checkLabel.className = 'model-label'; checkLabel.textContent = 'Prüfe deine Antwort'; const list = document.createElement('ul'); q.criteria.forEach(text => { const item = document.createElement('li'); item.textContent = text; list.append(item); });
      const reviewedLabel = document.createElement('label'); reviewedLabel.className = 'review-label'; const reviewed = document.createElement('input'); reviewed.type = 'checkbox'; reviewed.id = `${q.id}-reviewed`; reviewedLabel.append(reviewed, document.createTextNode(' Ich habe verglichen und meine Antwort bei Bedarf überarbeitet.'));
      model.append(modelLabel, example, checkLabel, list, reviewedLabel); card.append(heading, label, textarea, printAnswer, detail, compare, model); $('question-list').append(card);
      textarea.addEventListener('input', () => { answers[q.id] = textarea.value; printAnswer.textContent = textarea.value || 'Noch nicht beantwortet.'; compare.disabled = !textarea.value.trim(); reviewed.checked = false; if (compare.disabled) { model.hidden = true; compare.setAttribute('aria-expanded','false'); compare.textContent = 'Antwort vergleichen'; } updateProgress(); });
      compare.addEventListener('click', () => { model.hidden = !model.hidden; compare.setAttribute('aria-expanded', String(!model.hidden)); compare.textContent = model.hidden ? 'Antwort vergleichen' : 'Vergleichsantwort schließen'; });
      reviewed.addEventListener('change', updateProgress);
    });
  }
  $('topic-answer').addEventListener('input', event => { topic = event.target.value; $('topic-print').textContent = topic || 'Noch nicht beantwortet.'; $('topic-compare').disabled = !topic.trim(); $('topic-reviewed').checked = false; if (!topic.trim()) { $('topic-model').hidden = true; $('topic-compare').textContent = 'Themenvorschlag vergleichen'; $('topic-compare').setAttribute('aria-expanded','false'); } updateProgress(); });
  $('topic-compare').addEventListener('click', () => { $('topic-model').hidden = !$('topic-model').hidden; $('topic-compare').setAttribute('aria-expanded', String(!$('topic-model').hidden)); $('topic-compare').textContent = $('topic-model').hidden ? 'Themenvorschlag vergleichen' : 'Vergleich schließen'; });
  $('topic-reviewed').addEventListener('change', updateProgress);
  $('summary-answer').addEventListener('input', event => { summary = event.target.value; $('summary-print').textContent = summary || 'Noch nicht zusammengefasst.'; updateProgress(); });
  function updateProgress() {
    const count = Object.values(answers).filter(a => a.trim()).length;
    const reviews = Core.questions.filter(q => $(`${q.id}-reviewed`)?.checked).length;
    $('order-count').textContent = solved ? '8 von 8 richtig' : (result ? `${result.count} von 8 richtig` : 'Noch offen');
    $('question-count').textContent = `${count} von 5 beantwortet`; $('topic-count').textContent = topic.trim() ? 'Formuliert' : 'Freiwillig';
    $('summary-count').textContent = summary.trim() ? 'Zusammengefasst' : 'Noch offen';
    $('progress-order').classList.toggle('done', solved); $('progress-questions').classList.toggle('done', count === 5); $('progress-summary').classList.toggle('done', !!summary.trim()); $('progress-topic').classList.toggle('done', !!topic.trim());
    const complete = count === 5 && !!summary.trim();
    $('finish-status').textContent = complete ? `Die W-Fragen und die Inhaltszusammenfassung sind ausgefüllt. ${reviews} von 5 W-Antworten hast du als verglichen markiert. Sichere deine Ergebnisse. Wenn du noch Zeit hast, bearbeite die Sternchenaufgabe zum Thema.` : 'Beantworte die W-Fragen und fasse den Inhalt in Stichpunkten zusammen. Die Themenfrage ist eine freiwillige Zusatzaufgabe. Sichere anschließend deine Ergebnisse.';
  }
  function exportText() {
    const lines = ['NACHTS SCHLAFEN DIE RATTEN DOCH', 'Wolfgang Borchert · Meine Ergebnisse', '', '1. Bildfolge', `Meine Reihenfolge: ${order.join(' → ')}`, `Selbstkontrolle: ${solved ? 'Richtig geordnet' : 'Noch nicht als richtig bestätigt'}`, ''];
    Core.questions.forEach(q => lines.push(`${q.word} ${q.prompt}`, answers[q.id].trim() || '(noch nicht beantwortet)', `Verglichen: ${$(`${q.id}-reviewed`).checked ? 'ja' : 'noch nicht'}`, ''));
    lines.push('3. Inhaltszusammenfassung in Stichpunkten', summary.trim() || '(noch nicht zusammengefasst)', '', '★ Mein Thema (freiwillige Zusatzaufgabe)', topic.trim() || '(freiwillig – nicht bearbeitet)', `Verglichen: ${$('topic-reviewed').checked ? 'ja' : 'noch nicht'}`);
    return lines.join('\n');
  }
  $('download-results').addEventListener('click', () => { const blob = new Blob([exportText()], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Meine_Ergebnisse_Borchert.txt'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  $('print').addEventListener('click', () => { Core.questions.forEach(q => { $(`${q.id}-print`).textContent = answers[q.id].trim() || 'Noch nicht beantwortet.'; }); $('summary-print').textContent = summary.trim() || 'Noch nicht zusammengefasst.'; $('topic-print').textContent = topic.trim() || 'Freiwillige Zusatzaufgabe – nicht bearbeitet.'; window.print(); });
  $('reset').addEventListener('click', () => $('reset-dialog').showModal());
  $('cancel-reset').addEventListener('click', () => $('reset-dialog').close());
  $('confirm-reset').addEventListener('click', () => { order = Core.cards.map(card => card.id); selected = null; dragged = null; topic = ''; Core.questions.forEach(q => { answers[q.id] = ''; $(`${q.id}-answer`).value = ''; $(`${q.id}-reviewed`).checked = false; $(`${q.id}-model`).hidden = true; $(`${q.id}-compare`).disabled = true; $(`${q.id}-compare`).textContent = 'Antwort vergleichen'; $(`${q.id}-compare`).setAttribute('aria-expanded','false'); }); $('topic-answer').value = ''; $('topic-reviewed').checked = false; $('topic-model').hidden = true; $('topic-compare').disabled = true; $('topic-compare').textContent = 'Themenvorschlag vergleichen'; clearCheck(); renderCards(); $('reset-dialog').close(); $('selection-feedback').textContent = 'Das Arbeitsblatt wurde zurückgesetzt.'; $('bildfolge').scrollIntoView({ behavior:'smooth' }); });
  $('topic-compare').setAttribute('aria-expanded','false');
  $('topic-compare').setAttribute('aria-controls','topic-model');
  $('confirm-reset').addEventListener('click', () => $('topic-compare').setAttribute('aria-expanded','false'));
  $('confirm-reset').addEventListener('click', () => { summary = ''; $('summary-answer').value = ''; $('summary-print').textContent = ''; updateProgress(); });
  buildQuestions(); renderCards(); updateProgress();
})();
