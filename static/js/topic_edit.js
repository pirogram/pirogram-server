(function($, document, window) {
    var data = {};


    function saveDraft() {
        var currContent = data.editor.getValue();
        var currTitle = $("input[name=title]").val();
        var currTimestamp = new Date().getTime();

        if( (currContent == data.lastSavedContent
                && currTitle == data.lastSavedTitle)
                || currTimestamp - data.lastSavedTimestamp < 15000) {

            return;
        }

        var reqdata = {
            title: $("input[name=title]").val(),
            markdown: currContent
        }

        var success = function() {
            data.lastSavedTimestamp = currTimestamp;
            data.lastSavedContent = currContent;
            data.lastSavedTitle = currTitle;
            $("div.draft-save.notification").text("");
        }

        var error = function() {
            $("div.draft-save.notification").text("Error in saving draft.");
        }

        var opts = {type: "POST", data: JSON.stringify(reqdata), success: success, dataType: "json",
            error: error, contentType: 'application/json; charset=utf-8'};
        $.ajax("/topic/" + $("form.topic.form").attr("topic_slug") + "/drafts", opts);
    }

    function initEditor(content) {
        var editor = ace.edit("topic-markdown");
        data.editor = editor;

        editor.setTheme("ace/theme/dreamweaver");
        editor.getSession().setMode("ace/mode/markdown");
        editor.getSession().setUseWrapMode(true);
        editor.renderer.setShowGutter(false);
        editor.setHighlightActiveLine(false);
        editor.setOptions({
            fontFamily: "Monaco, Monospace",
            fontSize: "0.85rem"
        });
        editor.setShowPrintMargin(false);
        editor.renderer.setPadding(20);

        if( content) {
            editor.setValue(content);
        }

        $(".ui.topic.form a.make.full.screen").click(function(e) {
            e.preventDefault();
            editor.setOption("wrap", 80);
            editor.renderer.setPadding(350);
            editor.renderer.setScrollMargin(20,20);

            if( editor.container.requestFullscreen) {
                editor.container.requestFullscreen();
            } else if( editor.container.mozRequestFullScreen) {
                editor.container.mozRequestFullScreen();
            } else if( editor.container.webkitRequestFullScreen) {
                editor.container.webkitRequestFullScreen();
            } else if( editor.container.msRequestFullscreen) {
                editor.container.msRequestFullscreen();
            }
        });
    }


    var init = function() {
        initEditor();

        function fullscreenExitHandler() {
            if( !document.fullscreen && !document.mozFullScreen
                    && !document.webkitfullscreenchange
                    && !document.msfullscreenchange) {

                var content = data.editor.getValue();

                data.editor.destroy();
                data.editor = null;

                $("#topic-markdown").remove();
                $("div.ace-wrapper").html('<div id="topic-markdown"></div>');
                initEditor(content);
            }
        }

        $(document).on("fullscreenchange", fullscreenExitHandler);
        $(document).on("mozfullscreenchange", fullscreenExitHandler);
        $(document).on("webkitfullscreenchange", fullscreenExitHandler);
        $(document).on("msfullscreenchange", fullscreenExitHandler);

        $(".ui.topic.form").submit(function() {
            $(this).find("textarea[name=markdown]").val(data.editor.getValue());
        });

        data.lastSavedContent = data.editor.getValue();
        data.lastSavedTitle = $("input[name=title]").val();
        data.lastSavedTimestamp = new Date().getTime();
        setInterval(saveDraft, 5000);
    };

    $(document).ready(init);
}(jQuery, document, window));