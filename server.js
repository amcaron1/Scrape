require('dotenv').config();
// express does server tasks like loading files and handling HTTP requests
var express = require("express");
// morgan allows logging to the console
var logger = require("morgan");
// mongoose is a object data manager ODM for MongoDB
var mongoose = require("mongoose");
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server sending http requests
var axios = require("axios");
// cheerio is a web scraping tool used for extracting data from a website
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1/scrape";
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

// Routes

// Route for scraping the db for articles
app.get("/scrape", async function (req, res) {

    // First, we grab the body of the html with fetch
    try {
        const scrapage = await fetch("http://www.worldhistory.org/");
        const scrapage_text = await scrapage.text();
        
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(scrapage_text);

        // Creates an array for storing the articles
        var result_array = [];

        // Now, we grab every a element that is a child of class latest_content_items, and do the following:
        $("div.latest_content_items a").each(function (i, element) {

            // Save an empty result object
            var result = {};

            // Add the text, the href of every link, and an article summary, and save them as properties of the result object
            result.title = $(this).find("div.ci_header").children("h3").text();
            result.link = "http://www.worldhistory.org/" + $(this).attr("href");
            result.summary = $(this).find("div.ci_preview").text();

            // Push the data for an article to the result array
            result_array.push(result);

        });

        // Return the articles to the client
        res.json(result_array);
           
    } catch (e) {
         console.log(e);
    }    
});

// Route for getting all Articles from the db
app.get("/saved_articles", function (req, res) {

    // Grab every document in the Articles collection
    db.Article.find({})
        .then(function (dbArticle) {

            // If we were able to successfully find Articles, send them back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {

            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for saving a new Article in the db
app.post("/save_article/", function(req,res) {

  // First checks to see if the article has already been saved
  db.Article.findOne({"title": req.body.title})
    .then(function(dbArticle) {
      
      // If it is a new article, it is saved
      if (dbArticle == null) {
        db.Article.create(req.body)
          .then(function(dbArticle) {
            res.json("saved");
          })
          .catch(function(err) {
            // If an error occurred, log it
            console.log(err);
          })
      }

      // Else the client is notified that it is a duplicate
      else {
        res.json("duplicate");
      }
    })
})

// Route for deleting an Article from the db
app.get("/delete_article/:id", function(req,res) {

  db.Article.findOneAndDelete({_id: req.params.id})
    .then(function(response) {
      res.json("deleted")
    })
    .catch(function(err) {

      // If an error occurred, log it
      console.log(err);
    })
})

// Route for creating a new note in the db
app.post("/save_note/:id", function(req,res) {

  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated Article -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { $push:{note: dbNote._id} }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });

  })

 // Route for getting all notes for an article
app.get("/notes/:id", function(req,res) {

  db.Article.findOne({_id: req.params.id})
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, log it
      console.log(err);
    })
})

// Route for deleting a note from the db
app.get("/delete_note/:article_id/:note_id", function(req,res) {

  db.Note.findOneAndDelete({_id: req.params.note_id})
    .then(function(response) {
      return db.Article.findOneAndUpdate({ _id: req.params.article_id }, { $pull:{note: req.params.note_id} }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
})

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});