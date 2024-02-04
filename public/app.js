// Variable needed to prevent event handling when scrape in process
var processing = false;

// Scrapes the History Today for articles and displays them
$(document).on("click", ".display_scrape", async function () {
    if (!processing) {
        processing = true;

        // Empties the current articles so that new ones are not appended onto the old ones
        $("#articles").empty();

        // Grabs the articles and displays the appropriate infromation on the page
        await $.get("/scrape", function (data) {
            for (var i = 0; i < data.length; i++) {
                $("#articles").append("<div class='article'><a href=" + data[i].link + " target='_blank'>" + data[i].title + "</a><button class='btn save_article'>Save Article</button><br><p>" + data[i].summary + "</p></div>");
            }
        })
        processing = false;
    }
})

// Displays saved articles
$(document).on("click", ".display_saved", async function () {
    if (!processing) {
        processing = true;

        // Empties the current articles so that new ones are not appended onto the old ones
        $("#articles").empty();

        // Grabs the articles and displays the appropriate infromation on the page
        await $.get("/saved_articles", function (data) {
            for (var i = 0; i < data.length; i++) {

                // The id is hidden in an h6
                $("#articles").append("<div class='article'><a href=" + data[i].link + " target='_blank' >" + data[i].title + "</a><button class='btn delete_article'>Delete Article</button><button class='btn display_notes'>Display Notes</button><br><p>" + data[i].summary + "</p><h6 hidden>" + data[i]._id + "</h6></div>");
            }
        })
        processing = false;
    }
})


// Saves a selected article
$(document).on("click", ".save_article", function () {

    // Prepares new article data
    var data = {
        title: $(this).siblings("a").text(),
        link: $(this).siblings("a").attr("href"),
        summary: $(this).siblings("p").text()
    };

    // Saves article and notifies user
    $.post("/save_article/", data, function(response) {

        // The user is notified if it is a duplicate
        if (response == "duplicate") {
            $("#message").text("This article was not saved.  It already resides in the database.");
            $("#messageModal").modal("show");
            setTimeout(function () {$('#messageModal').modal('hide')}, 4000);
        }

        // The user is notified if it is successfully saved 
        else {
            $("#message").text("This article was successfully saved in the database.");
            $("#messageModal").modal("show");
            setTimeout(function () {$('#messageModal').modal('hide')}, 4000);
        }
    })
})

    
// Deletes a saved article
$(document).on("click", ".delete_article", function() {
    var articleId = $(this).siblings("h6").text();

    // Grabs the notes for the article and deletes them
    $.get("/notes/" + articleId, function (data) {
        if (data.note) {
            for (var i = 0; i < data.note.length; i++) {
                $.get("/delete_note/" + articleId + "/" + data.note[i]._id, function (res) {})
            }
        }
    })

    // Removes the article from display
    $(this).parent().remove();

    // Deletes the article from the database
    $.get("/delete_article/" + articleId, function(res) {})
})

// Displays the notes for an article
$(document).on("click", ".display_notes", function () {

    // Clears the notes modal
    $("#article_id").text("");
    $("#old_notes").empty();
    $("#new_note").val("");

    // Gets the article id from the article's hidden h6
    var articleId = $(this).siblings("h6").text();

    // Stores the article id in the modal's hidden h6
    $("#article_id").text(articleId);

    // Grabs the notes for the article and displays them
    $.get("/notes/" + articleId, function (data) {
        if (data.note) {
            for (var i = 0; i < data.note.length; i++) {

                // The id is hidden in an h6
                $("#old_notes").append("<div class='note'><p>" + data.note[i].body + "</p><button type='button' class='delete_note'>Delete Note</button><br><h6 hidden>" + data.note[i]._id + "</h6></div>");
            }
        }

        // Shows the notes modal
        $("#notesModal").modal("show");
    })
})

// Saves a new note
$(document).on("click", ".save_note", function() {
    var articleId = $("#article_id").text();

    // Prepares new note data
    var data = {
        body: $("#new_note").val()
    };

    // Saves the note and hides the notes modal
    $.post("/save_note/" + articleId, data, function(res) {
        $("#notesModal").modal("hide");
    });

});

// Deletes a saved note
$(document).on("click", ".delete_note", function() {

    // Gets the note id from the modal's hidden h6
    var note_id = $(this).siblings("h6").text();

    // Gets the article id from the modal's hidden h6
    var articleId = $("#article_id").text();

    // Removes the note from display
    $(this).parent().remove();

    // Deletes the note from the database
    $.get("/delete_note/" + articleId + "/" + note_id, function(resp) {})
})
     