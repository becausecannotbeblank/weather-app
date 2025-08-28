document.getElementById("checkBtn").addEventListener("click", () => {
  const location = document.getElementById("locationInput").value || "London";
  fetchWeather(location);
});

document.getElementById("geoBtn").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      fetchWeather(null, lat, lon);
    }, err => {
      alert("Geolocation failed: " + err.message);
    });
  } else {
    alert("Geolocation not supported");
  }
});


async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );
    const data = await res.json();
    // city → town → village → fallback to county → country
    return (
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.county ||
      data.address.country ||
      "My Location"
    );
  } catch (err) {
    console.error(err);
    return "My Location";
  }
}

async function fetchWeather(city, lat, lon) {
  try {
    let url;
    let displayName = city;

    if (lat && lon) {
      // Get a proper name for coords
      displayName = await reverseGeocode(lat, lon);

      url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=uv_index&daily=uv_index_max&timezone=auto`;
    } else {
      // City name → coordinates first
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
      if (!geoRes.ok) throw new Error("City geocoding failed");
      const geoData = await geoRes.json();
      if (!geoData.results?.length) throw new Error("City not found");

      const latCity = geoData.results[0].latitude;
      const lonCity = geoData.results[0].longitude;
      displayName = geoData.results[0].name;

      url = `https://api.open-meteo.com/v1/forecast?latitude=${latCity}&longitude=${lonCity}&current_weather=true&hourly=uv_index&daily=uv_index_max&timezone=auto`;
    }

    console.log("Fetching URL:", url);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather API request failed");
    const data = await res.json();

    // Get current UV index
    const now = new Date();
    const currentHour = now.toISOString().slice(0, 13) + ":00"; // e.g. "2025-08-27T15:00"
    let currentUV = "N/A";
    const hourIndex = data.hourly.time.indexOf(currentHour);
    if (hourIndex !== -1) {
      currentUV = data.hourly.uv_index[hourIndex];
    }

    const maxUV = data.daily?.uv_index_max?.[0] ?? "N/A";

    displayWeather(data, displayName, currentUV, maxUV);
  } catch (err) {
    console.error(err);
    alert("Error fetching weather");
  }
}

function displayWeather(data, locationName, currentUV, maxUV) {
  const weatherDiv = document.getElementById("weather");
  
  if (!data || !data.current_weather) {
    weatherDiv.innerHTML = `<p>No weather data available.</p>`;
    return;
  }

  const temp = data.current_weather.temperature;
  const wind = data.current_weather.windspeed;

  weatherDiv.innerHTML = `
    <h2>Weather for ${locationName}</h2>
    <p>Temperature: ${temp} °C</p>
    <p>Wind speed: ${wind} km/h</p>
    <p>Current UV index: ${currentUV}</p>
    <p>Max UV index today: ${maxUV}</p>
  `;
}
