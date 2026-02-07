/// <reference path="../pb_data/types.d.ts" />

// Creates the "team_members" collection linking users to teams with roles.
migrate((app) => {
  const teamsCollection = app.findCollectionByNameOrId("teams");
  const usersCollection = app.findCollectionByNameOrId("users");

  const collection = new Collection({
    type: "base",
    name: "team_members",
    listRule: "",
    viewRule: "",
    fields: [
      {
        name: "team",
        type: "relation",
        required: true,
        collectionId: teamsCollection.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: "user",
        type: "relation",
        required: true,
        collectionId: usersCollection.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: "role",
        type: "select",
        required: false,
        values: ["tech_lead", "senior_engineer", "engineer", "manager"],
        maxSelect: 1,
      },
    ],
  });

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("team_members");
  app.delete(collection);
});
