(function($, document, window) {
    $.checkIfTopicDone = function() {
        if( $("div.exercise").find("i.exercise.status.wait").size() === 0) {
            var opts = {type: "POST", data: JSON.stringify({}), dataType: "json",
                contentType: 'application/json; charset=utf-8'};

            var url = location.href.split('#')[0].split('?')[0] + '/done';
            $.ajax(url, opts);
        }
    };

    $(document).ready( function() {
        $.checkIfTopicDone();
    });

}(jQuery, document, window));

(function($, document, window) {
    timers = {};

    var reset = function(form) {
        form.removeClass("warning")
            .removeClass("success")
            .find("div.field")
            .removeClass("success")
            .removeClass("error");

    };

   var handleSubmit = function(e) {
        var error = false,
            $this = $(this);

        if( timers[this]) {
            clearTimeout(timers[this]);
        }

        delete(timers[this]);
        reset($this);
        e.preventDefault();

        $this.find("input[type=checkbox]").each( function() {
            var $this = $(this),
                correct = $this.attr("correct"),
                checked = $this.is(":checked"),
                $parent = $this.closest("div.field");
            if( (!correct && checked)
                || (correct && !checked)) {

                $parent.addClass("error");
                error = true;
            }
        });

        if( error) {
            $this.addClass("warning");
            timers[this] = setTimeout(function() {
                reset($this);
            }, 5000)
        } else {
            $this.addClass("success");

            $this.closest("div.exercise").find("i.icon.wait.exercise.status").removeClass("wait").addClass("checkmark");

            var opts = {type: "POST", data: JSON.stringify({}), dataType: "json",
                contentType: 'application/json; charset=utf-8'};
            $.ajax("/exercises/" + $this.closest("div.exercise").data("exercise-id") + "/done", opts);

            $.checkIfTopicDone();
        }
    };

    var init = function() {
        $("form.quiz").submit(handleSubmit);
    };

    $(document).ready(init);
}(jQuery, document, window));

(function($, document, window) {
    var reset = function(form) {
        form.removeClass("warning")
            .removeClass("success")
            .removeClass("error")
            .find("div.ui.label")
            .removeClass("green")
            .removeClass("red");

    };

   var handleSubmit = function(e) {
        reset($(this));
        e.preventDefault();

        var $this = $(this),
            regex = $this.find("input[type=text]").val(),
            texts = [],
            data = {"regex": regex, "texts": texts};

        $this.find("div.label.should-match").each(function() {
            texts.push($(this).text());
        });

        $this.find("div.label.should-not-match").each(function() {
            texts.push($(this).text());
        });

        var success = function(data) {
            var hasError = false;

            $this.find("div.label.should-match").each(function() {
                var text = $(this).text();
                if( data.texts[text]) {
                    $(this).addClass("green");
                } else {
                    hasError = true;
                }
            });

            $this.find("div.label.should-not-match").each(function() {
                var text = $(this).text();
                if( data.texts[text]) {
                    $(this).addClass("red");
                    hasError = true;
                }
            });

            if( hasError) {
                $this.addClass("warning");
            } else {
                $this.addClass("success");

                $this.closest("div.exercise").find("i.icon.wait.exercise.status").removeClass("wait").addClass("checkmark");

                var opts = {type: "POST", data: JSON.stringify({solution: {regex: regex}}), dataType: "json",
                    contentType: 'application/json; charset=utf-8'};
                $.ajax("/exercises/" + $this.closest("div.exercise").data("exercise-id") + "/done", opts);

                $.checkIfTopicDone();
            }
        };

        var error = function() {
            $this.addClass("error");
        };

        var opts = {type: "POST", data: JSON.stringify(data), success: success, dataType: "json",
                        error: error, contentType: 'application/json; charset=utf-8'};
        $.ajax("/regex-match", opts);
    };

    var init = function() {
        $("form.regex").submit(handleSubmit);
    };

    $(document).ready(init);
}(jQuery, document, window));