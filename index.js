require("dotenv").config();
const express = require("express");
const axios = require("axios");
const app = express();

app.set("view engine", "pug");
app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// * Please DO NOT INCLUDE the private app access token in your repo. Don't do this practicum in your normal account.
const PRIVATE_APP_ACCESS = process.env.ACCESS_TOKEN;
if (!PRIVATE_APP_ACCESS) {
  console.warn(
    "Warning: PRIVATE_APP_ACCESS is not set. Add ACCESS_TOKEN to your local .env (do not commit it).",
  );
}

// ROUTE: homepage — lists Games from the HubSpot custom object and renders `homepage.pug`
app.get("/", async (req, res) => {
  const properties = [
    "game_name",
    "genre",
    "release_date",
    "platform_availability",
    "esrb__pegi_rating",
    "development_status",
    "base_price",
    "global_sales__player_count",
    "lead_developer__studio",
    "game_engine",
    "store_url",
  ].join(",");
  const gamesEndpoint = `https://api.hubapi.com/crm/v3/objects/2-57074073?properties=${encodeURIComponent(properties)}&limit=100`;
  const headers = {
    Authorization: `Bearer ${PRIVATE_APP_ACCESS}`,
    "Content-Type": "application/json",
  };
  try {
    const resp = await axios.get(gamesEndpoint, { headers });
    const data = resp.data.results || [];
    res.render("homepage", { title: "Games | HubSpot APIs", data });
  } catch (error) {
    console.error("Error fetching games:", error.message);
    if (error.response) {
      console.error("HubSpot response status:", error.response.status);
      console.error(
        "HubSpot response data:",
        JSON.stringify(error.response.data, null, 2),
      );
    } else {
      console.error(error);
    }
    // On error show an empty homepage view instead of the old `games` template
    res.render("homepage", { title: "Games | HubSpot APIs", data: [] });
  }
});

// ROUTE: form — serves create/update form and option lists (update-cobj) -- implemented
app.get("/update-cobj", async (req, res) => {
  const genreOptions = [
    { label: "RPG", value: "RPG" },
    { label: "FPS", value: "FPS" },
    { label: "Strategy", value: "Strategy" },
    { label: "Simulation", value: "Simulation" },
    { label: "Indie", value: "Indie" },
    { label: "Action", value: "Action" },
    { label: "Adventure", value: "Adventure" },
    { label: "Puzzle", value: "Puzzle" },
    { label: "Sports", value: "Sports" },
    { label: "Racing", value: "Racing" },
    { label: "Fighting", value: "Fighting" },
    { label: "Horror", value: "Horror" },
  ];
  const ratingOptions = [
    { label: "EC", value: "EC" },
    { label: "E", value: "E" },
    { label: "E10+", value: "E10+" },
    { label: "T", value: "T" },
    { label: "M", value: "M" },
    { label: "AO", value: "AO" },
    { label: "RP", value: "RP" },
    { label: "3+", value: "3+" },
    { label: "7+", value: "7+" },
    { label: "12+", value: "12+" },
    { label: "16+", value: "16+" },
    { label: "18+", value: "18+" },
  ];
  const devStatusOptions = [
    { label: "In Development", value: "In Development" },
    { label: "Alpha", value: "Alpha" },
    { label: "Beta", value: "Beta" },
    { label: "Released", value: "Released" },
    { label: "Sunsetting", value: "Sunsetting" },
  ];
  const platformOptions = [
    { label: "PC", value: "PC" },
    { label: "PlayStation", value: "PlayStation" },
    { label: "Xbox", value: "Xbox" },
    { label: "Switch", value: "Switch" },
    { label: "Mobile", value: "Mobile" },
  ];
  const gameEngineOptions = [
    { label: "Unreal Engine 5", value: "Unreal Engine 5" },
    { label: "Unity", value: "Unity" },
    { label: "Godot", value: "Godot" },
    { label: "Proprietary", value: "Proprietary" },
  ];

  // fetch existing games (up to 100) to populate dropdown for updates
  const propertiesForList = [
    "game_name",
    "genre",
    "release_date",
    "platform_availability",
    "esrb__pegi_rating",
    "development_status",
    "base_price",
    "global_sales__player_count",
    "lead_developer__studio",
    "game_engine",
    "store_url",
  ].join(",");
  const listEndpoint = `https://api.hubapi.com/crm/v3/objects/2-57074073?properties=${encodeURIComponent(propertiesForList)}&limit=100`;
  const headers = {
    Authorization: `Bearer ${PRIVATE_APP_ACCESS}`,
    "Content-Type": "application/json",
  };
  try {
    const resp = await axios.get(listEndpoint, { headers });
    const games = resp.data.results || [];
    res.render("updates", {
      title: "Update Custom Object Form | Integrating With HubSpot I Practicum",
      genreOptions,
      ratingOptions,
      devStatusOptions,
      platformOptions,
      gameEngineOptions,
      games,
      selectedId: req.query.selected || "",
    });
  } catch (err) {
    console.error("Error fetching games for update form:", err.message);
    res.render("updates", {
      title: "Update Custom Object Form | Integrating With HubSpot I Practicum",
      genreOptions,
      ratingOptions,
      devStatusOptions,
      platformOptions,
      games: [],
    });
  }
});

// ROUTE: create/update — handles form POST to create or update a game and redirects to homepage
app.post("/update-cobj", async (req, res) => {
  const existingId = req.body.existing_id;

  // handle platform_availability array (checkboxes) or single value; send as an array to HubSpot
  const platformRaw = req.body.platform_availability;
  let platformArray = [];
  if (Array.isArray(platformRaw)) {
    platformArray = platformRaw.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof platformRaw === "string" && platformRaw.trim()) {
    platformArray = String(platformRaw)
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const props = {
    game_name: req.body.game_name,
    genre: req.body.genre || "",
    release_date: req.body.release_date || "",
    // Send platform_availability as a semicolon-separated string (HubSpot expects `;` between enum values)
    platform_availability: platformArray.join(";"),
    esrb__pegi_rating: req.body.rating || "",
    development_status: req.body.development_status || "",
    base_price: req.body.base_price || "",
    global_sales__player_count: req.body.global_sales || "",
    lead_developer__studio: req.body.lead_developer || "",
    game_engine: req.body.game_engine || "",
    store_url: req.body.store_url || "",
  };
  const payload = { properties: props };
  const headers = {
    Authorization: `Bearer ${PRIVATE_APP_ACCESS}`,
    "Content-Type": "application/json",
  };

  try {
    if (existingId) {
      const updateEndpoint = `https://api.hubapi.com/crm/v3/objects/2-57074073/${existingId}`;
      await axios.patch(updateEndpoint, payload, { headers });
    } else {
      const createEndpoint = `https://api.hubapi.com/crm/v3/objects/2-57074073`;
      await axios.post(createEndpoint, payload, { headers });
    }

    return res.redirect("/");
  } catch (err) {
    console.error(
      "Error creating/updating game:",
      err.response ? err.response.data : err.message,
    );
    return res.redirect("/update-cobj");
  }
});
// DELETE route to remove a custom object record by id
app.delete("/delete-cobj/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Missing id parameter" });

  const deleteEndpoint = `https://api.hubapi.com/crm/v3/objects/2-57074073/${id}`;
  const headers = {
    Authorization: `Bearer ${PRIVATE_APP_ACCESS}`,
    "Content-Type": "application/json",
  };

  try {
    await axios.delete(deleteEndpoint, { headers });
    return res.status(204).send();
  } catch (err) {
    console.error(
      "Error deleting game:",
      err.response ? err.response.data : err.message,
    );
    if (err.response) {
      return res.status(err.response.status).json({ error: err.response.data });
    }
    return res.status(500).json({ error: err.message });
  }
});
// * Localhost (respect PORT env when set)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
