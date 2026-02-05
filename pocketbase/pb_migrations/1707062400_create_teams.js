/// <reference path="../pb_data/types.d.ts" />

// Creates the "teams" collection for organizing users into teams.
migrate((app) => {
  const collection = new Collection({
    type: "base",
    name: "teams",
    fields: [
      {
        name: "name",
        type: "text",
        required: true,
        min: 1,
        max: 100,
      },
      {
        name: "description",
        type: "text",
        required: false,
        max: 500,
      },
    ],
  });

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("teams");
  app.delete(collection);
});
