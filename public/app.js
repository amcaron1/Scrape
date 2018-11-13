// Scrapes the db for articles and displays them
$(document).on("click", ".display_scrape", function() {
  // Empties the current articles so that new ones are not appended on to the old ones
  $("#articles").empty();

  // Grabs the articles as a json
  $.get("/scrape", function(data) {
  
    // For each one
    for (var i = 0; i < data.length; i++) {

      // Display the apropos information on the page
      $("#articles").append("<div class='article'><a href=" + data[i].link + " target='_blank'>" + data[i].title + "</a><button type='button' class='save_article'>Save Article</button><br><p>" + data[i].summary + "</p></div>");
    }
  })
})

// Saves a selected article
$(document).on("click", ".save_article", function() {
  var title = $(this).siblings("a").text();
  var link = $(this).siblings("a").attr("href");
  var summary = $(this).siblings("p").text();

  var data = {
    title: title,
    link: link,
    summary: summary
  };

  $.post("/save_article/", data, function(response) {

    // The user is notified if it is a duplicate
    if (response == "duplicate") {
      $("#message").text("This article was not saved.  It already resides in the database.");
      $("#messageModal").modal("show");
    }

    // The user is notified if it is successfully savede 
    else {
      $("#message").text("This article was successfully saved in the database.");
      $("#messageModal").modal("show");
    }
  })
})

// Displays saved articles
$(document).on("click", ".display_saved", function() {

  // Empties the current articles so that new ones are not appended on to the old ones
  $("#articles").empty();

  // Grabs the articles as a json
  $.get("/saved_articles", function(data) {

    // For each one
    for (var i = 0; i < data.length; i++) {

      // Display the apropos information on the page
      // The id is hidden in an h6
      $("#articles").append("<div class='article'><a href=" + data[i].link + " target='_blank' >" + data[i].title + "</a><button type='button' class='delete_article'>Delete Article</button><button type='button' class='display_notes'>Display Notes</button><br><p>" + data[i].summary + "</p><h6 hidden>" + data[i]._id + "</h6></div>");
    }
  })
})
    
// Deletes a saved article
$(document).on("click", ".delete_article", function() {
  var this_id = $(this).siblings("h6").text();

  // Removes the article from display
  $(this).parent().remove();
  $.get("/delete_article/" + this_id, function(response) {
    console.log("response: " + response);
  })
})

// Saves a new note
$(document).on("click", ".save_note", function() {
  var thisId = $("#article_id").text();
  var note = $("#new_note").val();

  var data = {
    body: note
  };
  console.log("data:" + data);
 
  $.post("/save_note/" + thisId, data, function(response) {

      // Hide the modal
      $("#notesModal").modal("hide");
    });

});

// Displays the notes for an article
$(document).on("click", ".display_notes", function() {

  $("#article_id").text("");
  $("#old_notes").empty();
  $("#new_note").val("");

  var this_id = $(this).siblings("h6").text();
  $("#article_id").text(this_id);

  $.get("/notes/" + this_id, function(data) {
    if (data.note) {
      for (var i = 0; i < data.note.length; i++){
        $("#old_notes").append("<div class='note'><p>" + data.note[i].body + "</p><button type='button' class='delete_note'>Delete Note</button><br><h6 hidden>" + data.note[i]._id + "</h6></div>");
      }
    }
  $("#notesModal").modal("show");
  console.log("data: " + data);
  })
})

// Deletes a saved article
$(document).on("click", ".delete_note", function() {
  var note_id = $(this).siblings("h6").text();
  var article_id = $("#article_id").text();

  // Removes the note from display
  $(this).parent().remove();
  $.get("/delete_note/" + article_id + "/" + note_id, function(response) {
    console.log("response: " + response);
  })
})
     