
$(document).on("click", "#en_lang", function() {
    loadTranslations("en");
})

$(document).on("click", "#zh_lang", function() {
    loadTranslations("zh");
})

function loadTranslations(lang) {
    if (localStorage.getItem(`selectedLanguage`) == lang) {
        applyTranslations(JSON.parse(localStorage.getItem(`translations`)));
    } else {
        $.getJSON("assets/lang/lang.json", function (data) {
            if (data[lang]) {
                localStorage.setItem(`translations`, JSON.stringify(data[lang]));
                localStorage.setItem("selectedLanguage", lang);
                applyTranslations(data[lang]);
            }
        });
    }
}

function applyTranslations(translations) {
    $(".translatable").each(function () {
        let key = $(this).data("key");
        if (translations[key]) {
            $(this).text(translations[key]);
            $(this).attr("placeholder", translations[key]);
        }
    });
}

let savedLang = localStorage.getItem("selectedLanguage") || "en";
loadTranslations(savedLang);