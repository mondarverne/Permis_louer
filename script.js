// Création de la constance map
const map = new maplibregl.Map({
  container: "map",
  style: "https://raw.githubusercontent.com/go2garret/maps/main/src/assets/json/openStreetMap.json", // Exemple de style de carte
  center: [3.174880,45.686700], // Centre par défaut (Paris)
  zoom: 12, // Niveau de zoom par défaut
});


// Variable pour stocker le marqueur actuel (nul au départ)
let currentMarker = null; 


// Accès au données des secteurs permis de louer
const lien_data_permis_louer =
  "https://raw.githubusercontent.com/mondarverne/Permis_louer/main/DATA/data_permis_louer.geojson";

const lien_data_communes_permis_louer =
  "https://raw.githubusercontent.com/mondarverne/Permis_louer/main/DATA/data_communes_permis_louer.geojson";



// Fonction de recherche d'adresse
function geocode(address) {
  // fetch -> envoie une requête GET à l'URL (api de geocodage de l'État)
  fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=5`
  )
    // then -> méthode de traitement de la réponse (la convertit en JSON)
    .then((response) => response.json())
    .then((data) => {
      // Vérification qu'il y ait bien une réponse
      if (data.features && data.features.length > 0) {
        const coordinates = data.features[0].geometry.coordinates;
        // Zoom vers la réponse
        map.flyTo({
          center: coordinates,
          zoom: 14
        });

        // Supprimer l'ancien marqueur s'il existe
        if (currentMarker) {
          currentMarker.remove();
        }

        // Ajouter un nouveau marqueur
        currentMarker = new maplibregl.Marker()
          .setLngLat(coordinates)
          .addTo(map);
      
      } else {
        alert("Adresse introuvable");
      }
    })
    .catch((error) => {
      console.error("Erreur de géocodage :", error);
    });
}


// début de l'affichage des couches avec le map.on
map.on("load", function () {


  // Configuration légende
  map.getCanvas().style.cursor = 'default';
    map.getCanvas().style.cursor = 'default';
    var layers = ["Secteurs soumis au permis de louer"];
    var colors = ['#e14815ff'];
    for (i=0; i<layers.length; i++) {
        var layer = layers[i] + "";
        var color = colors[i];
        var item = document.createElement('div');
        var key = document.createElement('span');
        key.className = 'legend-key';
        key.style.backgroundColor = color;
        var value = document.createElement('span');
        value.innerHTML = layer;
        item.appendChild(key);
        item.appendChild(value);
        legend.appendChild(item);
    }


  // Boutons de navigation
  var nav = new maplibregl.NavigationControl();
  map.addControl(nav, "top-right");


  // Ajout d'un écouteur d'événement sur le bouton de recherche
  document.getElementById("search-button").addEventListener("click", function () {
    const address = document.getElementById("search-input").value;
    if (address.trim() !== "") {
      geocode(address);
    }
  });

  // Ajout d'un écouteur d'événement pour la touche "Entrée" sur le champ de saisie
  document.getElementById("search-input").addEventListener("keydown", function (event) {
    if (event.key === 'Enter') {
      const address = document.getElementById("search-input").value;
      if (address.trim() !== "") {
        geocode(address);
      }
    }
  });





    // Ajout du cadastre disponible sur ETALAB 
    map.addSource("Cadastre", {
      type: "vector",
      url: "https://openmaptiles.geo.data.gouv.fr/data/cadastre.json"
    });

    //creation de la couche pour afficher uniquement les contours (on passe du fill au line)
  map.addLayer({
    id: "Cadastre", 
    type: "line",
    source: "Cadastre",
    "source-layer": "parcelles",
    layout: { visibility: "visible" },
    paint: { "line-color": "#666666", "line-width": 0.4 }, //couleur poly
    minzoom: 17,
  });


  
    // Ajout parcelles concernés par le permis de louer depuis GitHub
    map.addSource('parc_permis_louer', {
      type: 'geojson',
      data: 'https://raw.githubusercontent.com/mondarverne/Permis_louer/main/DATA/data_permis_louer.geojson'
    });

    map.addLayer({
      id : 'parcelles_permis_louer',
      type : 'fill',
      source : 'parc_permis_louer',
      layout: { visibility: 'visible'},  // visible, none
      paint: {
        "fill-color": "#e14815ff", //couleur poly
        "fill-opacity": 0.4, // opacite
        //"fill-outline-color": "#F9A03F" // couleurs contours
      },
    });   


  // Préparation des données pour le zoom en fonction du choix des communes
  // Transformation du geojson en un tableau de données
  fetch(lien_data_communes_permis_louer)
    .then((response) => response.json())
    .then((data) => {
      const COM = data;

      // Extraire les noms des communes
      const nom_comValues = [
        ...new Set(data.features.map((feature) => feature.properties.nom_com))].sort();


      // Remplir le menu déroulant avec les noms des communes
      const select = document.getElementById("select");
      nom_comValues.forEach((nom_com) => {
        const option = document.createElement("option");
        option.value = nom_com;
        option.textContent = nom_com;
        select.appendChild(option);
      });

      // Ajouter un événement pour centrer la carte sur la commune sélectionnée
      select.addEventListener("change", () => {
        const selectedCommune = select.value;
        if (selectedCommune) {
          const communeFeatures = data.features.filter(
            (feature) => feature.properties.nom_com === selectedCommune
          );
          if (communeFeatures.length > 0) {
            const bbox = turf.bbox({
              type: "FeatureCollection",
              features: communeFeatures
            });
            map.fitBounds(bbox, { padding: 20 });
          }
        }
      });
    
      // Mise à jour de la fonction handleSelectChange pour zoomer sur la commune sélectionnée
      handleZoomSelectChange = () => {
        const commune = document.getElementById("select").value;

        if (commune !== "default") {
          const selectedFeature = COM.features.find(
            (feature) => feature.properties.nom_com === commune
          );
          // Ajout de la fonctionnalité de zoom sur la ou les communes sélectionnées
          const bounds = new maplibregl.LngLatBounds();
          const feature = selectedFeature;
          const coordinates = feature.geometry.coordinates;
          if (feature.geometry.type === "Polygon") {
            coordinates.forEach((coord) => {
              coord.forEach((c) => bounds.extend(c));
            });
          } else if (feature.geometry.type === "MultiPolygon") {
            coordinates.forEach((poly) => {
              poly.forEach((coord) => {
                coord.forEach((c) => bounds.extend(c));
              });
            });
          }

          map.fitBounds(bounds, {
            padding: 40,
            duration: 1000
          });
        } else {
          // Réinitialiser le zoom à la position et au niveau d'échelle initiaux
          map.flyTo({
            center: [3.174880,45.686700], //localisation
            zoom: 8
          });
        }
      };
      document
        .getElementById("select")
        .addEventListener("change", handleZoomSelectChange);
    });


  // Ajout du bouton de geolocalisation
  map.addControl(
    new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    })
  );
  
  
  // Ajout de l'échelle
  var scale = new maplibregl.ScaleControl({
    maxWidth: 100,
    unit: 'metric'
  });
  map.addControl(scale);

});