// ==UserScript==
// @name        WaniKani Show Context Sentence
// @namespace   skatefriday
// @match       https://www.wanikani.com/subjects/review
// @match       https://www.wanikani.com/subjects/extra_study*
// @require     https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @grant       none
// @version     1.1.2
// @license     Apache, https://www.apache.org/licenses/LICENSE-2.0
// @author      skatefriday
// @description Show context sentence on review page.
// ==/UserScript==

(function() {

if (!window.wkof) {
    alert('The show context sentence script requires Wanikani Open Framework.\nYou will now be forwarded to installation instructions.');
    window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
    return;
}

var currSubject = null;
var sentence = "";
var translation = "";
var showTranslationKey = "control"; // https://www.toptal.com/developers/keycode/table
var showTranslationCode = ""; // this overrides showTranslationKey if set
var translationVisible = false;
var sentenceNode = null;
var wk_items = null;

function hideTranslation(hide, node) {
    if (!node && sentenceNode)
      node = sentenceNode.querySelector('span + span');

    if (node) node.style.backgroundColor = hide ? 'white' : '#a100f1';
}

function format_sentence(sentence, characters) {
    if (!characters)
        return sentence;

    const highlightElement = '<span style="font-weight: bold;">$1</span>';

    // highlight characters in the sentence
    const regex = new RegExp(`(${characters})`, 'g');
    let formattedSentence = sentence.replace(regex, highlightElement);

    // if not change
    if (formattedSentence === sentence) {
        // remove all kana characters and only keep kanji from characters
        const kanaRegex = /[ぁ-ゖ]/g;
        const kanjiOnly = characters.replace(kanaRegex, '');
        formattedSentence = sentence.replaceAll(new RegExp(`(${kanjiOnly})`, 'g'), highlightElement);
    }

    return formattedSentence;
}

function get_random_sentence_index(sentences) {
    const max = sentences.length;
    return Math.floor(Math.random() * max);
}

function get_new_sentence()
{
    if (wk_items == null) {
      return;
    }

    if (currSubject.type === "Vocabulary") {
      sentenceNode.style.display = 'flex';

      let id_index = wkof.ItemData.get_index(wk_items, 'subject_id');
      let item = id_index[currSubject.id]
      let random_index = get_random_sentence_index(item.data.context_sentences);

      sentence = item.data.context_sentences[random_index]?.ja || '';
      translation = item.data.context_sentences[random_index]?.en || '';

      if (sentence)
        sentence = format_sentence(sentence, item.data.characters);

    } else {
      sentence = ""
      translation = "";
      sentenceNode.style.display = 'none';
    }

    sentenceNode.querySelector('span[data-type="sentence"]').innerHTML = sentence;
    sentenceNode.querySelector('span[data-type="translation"]').innerHTML = translation;

    hideTranslation(true, sentenceNode.querySelector('span[data-type="translation"]'));
    translationVisible = false;
}

window.addEventListener(`willShowNextQuestion`, e => {
	console.log(e.detail);
  currSubject = e.detail.subject;
  get_new_sentence();
});

window.addEventListener(`didAnswerQuestion`, e => {
  const questionType = e.detail.questionType;
  const passed = e.detail.results.passed;

  // if got a meaning question correct, show the translation
  if (questionType === 'meaning' && passed) {
    hideTranslation(false);
    translationVisible = true;
  }
});

// if passed a subject, show the translation
window.addEventListener(`didChangeSRS`, e => {
  hideTranslation(false);
  translationVisible = true;
});

// show translation on keydown
function handleKeyShowTranslation(e) {
  const key = (showTranslationCode ? e.code : e.key)?.toLowerCase();
  const choice = (showTranslationCode || showTranslationKey)?.toLowerCase();
  if (key === choice)
    hideTranslation(e.type === (!translationVisible ? 'keyup' : 'keydown'));
}

window.addEventListener('keydown', handleKeyShowTranslation);
window.addEventListener('keyup', handleKeyShowTranslation);


var config = {
    wk_items: {
        options: {
            study_materials: true
        }
    }
};

//
// Note that this async operation is slower than the willShowNextQuestion above.
// Which is why we cache the current subject as a global in the event handler.
// Otherwise the first item, if vocabulary, will have no sentence.
//
function fetch_items()
{
    wkof.ItemData.get_items(config)
        .then((items) => { wk_items = items; })
        .then(get_new_sentence);

    console.log("Fetched the items")
}

function startup_wkof()
{
    wkof.include('ItemData');
    wkof.ready('ItemData')
      .then(fetch_items);
}

function install_context_sentence_css()
{
    var better_font = "<link href=\"https://fonts.googleapis.com/css?family=Sawarabi+Mincho\" rel=\"stylesheet\">";
    var context_sentence_css = `
      .wf-sawarabimincho {
        font-family: \"Sawarabi Mincho\";
        font-size:1.5em; background-color:#a100f1;
        color:#ffffff;
        text-align:center;
        padding: 10px;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        row-gap: 12px;
        display: none;
      }

      .wf-sawarabimincho span+span {
        cursor: pointer;
      }
    `

    $('head').append(better_font);
    $('head').append('<style>'+ context_sentence_css +'</style>');
}

$(document).ready(function()
{
const quizInput = document.querySelector('.quiz-input');
  if (quizInput) {
    quizInput.insertAdjacentHTML('beforebegin', `
      <div class="wf-sawarabimincho">
        <span data-type="sentence">${sentence}</span>
        <span data-type="translation" style="background-color: white">${translation}</span>
      </div>
    `);
  }

  sentenceNode = document.querySelector('.wf-sawarabimincho');

  // show/hide translation on hover
  const translationSpan = sentenceNode.querySelector('span[data-type="translation"]');
  if (translationSpan) {
    translationSpan.addEventListener('mouseover', e => hideTranslation(translationVisible, e.target));
    translationSpan.addEventListener('mouseout', e => hideTranslation(!translationVisible, e.target));
  }

  startup_wkof();
  install_context_sentence_css();
  console.log( "ready!" );
});

})();