import DBHelper from "./dbhelper";

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener("DOMContentLoaded", event => {
  initMap(); // added
  fetchNeighborhoods();
  fetchCuisines();
  registerServiceWorker(); // Registering SW

  const neighborhoodsSelectId = document.getElementById("neighborhoods-select");
  neighborhoodsSelectId.addEventListener("change", updateRestaurants);

  const cuisinesSelectId = document.getElementById("cuisines-select");
  cuisinesSelectId.addEventListener("change", updateRestaurants);
});

/**
 * Register a SW for caching static and dynamic assets.
 */
const registerServiceWorker = () => {
  if (!navigator.serviceWorker) {
    return;
  }
  navigator.serviceWorker
    .register("../sw.js")
    .then(() => {
      console.log("Service worker registered successfully!");
    })
    .catch(error => {
      console.log("Error while registering service worker:", error);
    });
};

/**
 * Lazy loading imgs
 */
const lazyLoadImages = () => {
  const lazyPictures = [].slice.call(document.querySelectorAll("picture.lazy"));

  if ("IntersectionObserver" in window) {
    const lazyPictureObserver = new IntersectionObserver(pictures => {
      pictures.forEach(picture => {
        if (picture.isIntersecting) {
          const lazyPicture = picture.target;
          lazyPicture.childNodes[0].srcset =
            lazyPicture.childNodes[0].dataset.srcset;
          lazyPicture.childNodes[1].srcset =
            lazyPicture.childNodes[1].dataset.srcset;
          lazyPicture.childNodes[2].src = lazyPicture.childNodes[2].dataset.src;
          lazyPicture.classList.remove("lazy");
          lazyPictureObserver.unobserve(lazyPicture);
        }
      });
    });

    lazyPictures.forEach(lazyPicture => {
      lazyPictureObserver.observe(lazyPicture);
    });
  }
};

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) {
      // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById("neighborhoods-select");
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement("option");
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById("cuisines-select");

  cuisines.forEach(cuisine => {
    const option = document.createElement("option");
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize leaflet map, called from HTML.
 */
const initMap = () => {
  self.newMap = L.map("map", {
    center: [40.722216, -73.987501],
    zoom: 12,
    scrollWheelZoom: false
  });
  L.tileLayer(
    "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}",
    {
      mapboxToken:
        "pk.eyJ1IjoiZ2Vla3lzcm0iLCJhIjoiY2pqOWlyYm9wMThubjNxbzVsbWZrZDFkYSJ9.qR-h7UMZRad_rFeA-GegMQ",
      maxZoom: 18,
      attribution: `Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, +
        <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>,  +
        Imagery © <a href="https://www.mapbox.com/">Mapbox</a>`,
      id: "mapbox.streets"
    }
  ).addTo(self.newMap);

  updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
  const cSelect = document.getElementById("cuisines-select");
  const nSelect = document.getElementById("neighborhoods-select");

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    (error, restaurants) => {
      if (error) {
        // Got an error!
        console.error(error);
      } else {
        resetRestaurants(restaurants);
        fillRestaurantsHTML();
      }
    }
  );
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = restaurants => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById("restaurants-list");
  ul.innerHTML = "";

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById("restaurants-list");
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
  lazyLoadImages();
};

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = restaurant => {
  const li = document.createElement("li");

  const picture = document.createElement("picture");
  const webPsource = document.createElement("source");
  const jpegSource = document.createElement("source");

  picture.className = "lazy";
  webPsource.dataset.srcset = DBHelper.imageWebp(restaurant);
  webPsource.type = "image/webp";

  jpegSource.dataset.srcset = DBHelper.imageJpg(restaurant);
  jpegSource.type = "image/jpeg";

  const image = document.createElement("img");
  image.className = "restaurant-img";
  image.dataset.src = DBHelper.imageJpg(restaurant);
  // Add alt-text for restaurant images according to restaurant names.
  image.alt = `Name of the restaurant: ${restaurant.name}`;

  picture.appendChild(webPsource);
  picture.appendChild(jpegSource);
  picture.appendChild(image);
  li.append(picture);

  const name = document.createElement("h3");
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement("p");
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement("p");
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement("a");
  more.innerHTML = "View Details";
  more.href = DBHelper.urlForRestaurant(restaurant);
  // Make link have role of button with better label for improved accessibility and user experience.
  more.setAttribute("role", "button");
  more.setAttribute(
    "aria-label",
    "view details of " + restaurant.name + " restaurant"
  );
  li.append(more);

  return li;
};

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);

    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });
};
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */
