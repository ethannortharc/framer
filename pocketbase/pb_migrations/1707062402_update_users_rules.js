/// <reference path="../pb_data/types.d.ts" />

// Updates the "users" collection rules to allow public listing for the backend proxy.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.listRule = "";
  collection.viewRule = "";
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.listRule = "id = @request.auth.id";
  collection.viewRule = "id = @request.auth.id";
  app.save(collection);
});
