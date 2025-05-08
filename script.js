// Configuração da API
const API_KEY = "c472526650766b86e8c687ad7cb107d4" // Chave API atualizada
const BASE_URL = "https://api.openweathermap.org/data/2.5"
const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct"
const ICON_URL = "https://openweathermap.org/img/wn/"

// Elementos DOM
const searchForm = document.getElementById("search-form")
const searchInput = document.getElementById("search-input")
const suggestionsContainer = document.getElementById("suggestions-container")
const cityName = document.querySelector(".city-name")
const currentDate = document.querySelector(".current-date")
const weatherIcon = document.querySelector(".weather-icon i")
const tempValue = document.querySelector(".temp-value")
const description = document.querySelector(".description")
const feelsLike = document.querySelector(".feels-like span")
const windSpeed = document.querySelector(".wind-speed")
const humidity = document.querySelector(".humidity")
const pressure = document.querySelector(".pressure")
const sunrise = document.querySelector(".sunrise")
const sunset = document.querySelector(".sunset")
const visibility = document.querySelector(".visibility")
const clouds = document.querySelector(".clouds")
const forecastCards = document.getElementById("forecast-cards")
const errorModal = document.getElementById("error-modal")
const errorMessage = document.getElementById("error-message")
const closeErrorBtn = document.getElementById("close-error-btn")
const closeModalBtn = document.querySelector(".close-modal")

// Variáveis para controle de sugestões
let suggestionTimeout = null
const MIN_CHARS_FOR_SUGGESTIONS = 3
const SUGGESTION_DELAY = 300 // ms

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  // Carregar a última cidade pesquisada ou usar uma cidade padrão
  const lastCity = localStorage.getItem("lastCity") || "São Paulo"
  getWeatherData(lastCity)

  // Event listeners
  searchForm.addEventListener("submit", handleSearch)
  searchInput.addEventListener("input", handleInput)
  searchInput.addEventListener("focus", () => {
    if (searchInput.value.length >= MIN_CHARS_FOR_SUGGESTIONS) {
      showSuggestions(searchInput.value)
    }
  })
  searchInput.addEventListener("blur", () => {
    // Pequeno delay para permitir que o clique na sugestão seja processado
    setTimeout(() => {
      suggestionsContainer.innerHTML = ""
    }, 200)
  })
  closeErrorBtn.addEventListener("click", closeErrorModal)
  closeModalBtn.addEventListener("click", closeErrorModal)

  // Fechar sugestões ao clicar fora
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
      suggestionsContainer.innerHTML = ""
    }
  })
})

// Funções
function handleSearch(e) {
  e.preventDefault()
  const city = searchInput.value.trim()

  if (city) {
    getWeatherData(city)
    searchInput.value = ""
    suggestionsContainer.innerHTML = ""
  }
}

function handleInput(e) {
  const query = e.target.value.trim()

  // Limpar o timeout anterior
  if (suggestionTimeout) {
    clearTimeout(suggestionTimeout)
  }

  // Se o campo estiver vazio, limpar sugestões
  if (query.length < MIN_CHARS_FOR_SUGGESTIONS) {
    suggestionsContainer.innerHTML = ""
    return
  }

  // Definir um novo timeout para evitar muitas requisições
  suggestionTimeout = setTimeout(() => {
    showSuggestions(query)
  }, SUGGESTION_DELAY)
}

async function showSuggestions(query) {
  try {
    const response = await fetch(`${GEO_URL}?q=${query}&limit=5&appid=${API_KEY}`)

    if (!response.ok) {
      throw new Error("Não foi possível obter sugestões de cidades.")
    }

    const cities = await response.json()

    // Limpar sugestões anteriores
    suggestionsContainer.innerHTML = ""

    if (cities.length === 0) {
      const noResults = document.createElement("div")
      noResults.className = "suggestion-item no-results"
      noResults.textContent = "Nenhuma cidade encontrada"
      suggestionsContainer.appendChild(noResults)
      return
    }

    // Criar elementos para cada sugestão
    cities.forEach((city) => {
      const suggestionItem = document.createElement("div")
      suggestionItem.className = "suggestion-item"
      suggestionItem.textContent = `${city.name}, ${city.country}`

      // Adicionar evento de clique
      suggestionItem.addEventListener("click", () => {
        searchInput.value = city.name
        suggestionsContainer.innerHTML = ""
        getWeatherData(city.name)
      })

      suggestionsContainer.appendChild(suggestionItem)
    })
  } catch (error) {
    console.error("Erro ao buscar sugestões:", error)
  }
}

async function getWeatherData(city) {
  try {
    setLoadingState(true)

    // Obter dados atuais do clima
    const currentWeatherResponse = await fetch(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric&lang=pt_br`)

    if (!currentWeatherResponse.ok) {
      if (currentWeatherResponse.status === 404) {
        throw new Error(`A cidade "${city}" não foi encontrada. Verifique se o nome está correto e tente novamente.`)
      } else {
        throw new Error(`Erro ao buscar dados meteorológicos: ${currentWeatherResponse.statusText}`)
      }
    }

    const currentWeatherData = await currentWeatherResponse.json()

    // Salvar a cidade pesquisada
    localStorage.setItem("lastCity", city)

    // Obter previsão para 5 dias
    const forecastResponse = await fetch(`${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=pt_br`)

    if (!forecastResponse.ok) {
      throw new Error("Não foi possível obter a previsão para os próximos dias.")
    }

    const forecastData = await forecastResponse.json()

    // Atualizar a interface
    updateCurrentWeather(currentWeatherData)
    updateForecast(forecastData)
  } catch (error) {
    showError(error.message)
  } finally {
    setLoadingState(false)
  }
}

function updateCurrentWeather(data) {
  // Atualizar informações básicas
  cityName.textContent = `${data.name}, ${data.sys.country}`
  currentDate.textContent = formatDate(new Date())
  tempValue.textContent = Math.round(data.main.temp)
  description.textContent = data.weather[0].description
  feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`

  // Atualizar detalhes
  windSpeed.textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`
  humidity.textContent = `${data.main.humidity}%`
  pressure.textContent = `${data.main.pressure} hPa`

  // Atualizar informações adicionais
  sunrise.textContent = formatTime(data.sys.sunrise * 1000)
  sunset.textContent = formatTime(data.sys.sunset * 1000)
  visibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`
  clouds.textContent = `${data.clouds.all}%`

  // Atualizar ícone
  updateWeatherIcon(data.weather[0].id)
}

function updateForecast(data) {
  forecastCards.innerHTML = ""

  // Filtrar previsões para obter apenas uma por dia (ao meio-dia)
  const dailyForecasts = data.list.filter((item) => item.dt_txt.includes("12:00:00"))

  // Limitar a 5 dias
  const forecasts = dailyForecasts.slice(0, 5)

  forecasts.forEach((forecast) => {
    const date = new Date(forecast.dt * 1000)
    const dayName = formatDay(date)
    const iconCode = forecast.weather[0].id
    const maxTemp = Math.round(forecast.main.temp_max)
    const minTemp = Math.round(forecast.main.temp_min)

    const forecastCard = document.createElement("div")
    forecastCard.className = "card forecast-card"
    forecastCard.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-icon">
                ${getWeatherIconHTML(iconCode)}
            </div>
            <div class="forecast-temp">
                <span class="forecast-max">${maxTemp}°</span>
                <span class="forecast-min">${minTemp}°</span>
            </div>
            <div class="forecast-desc">${forecast.weather[0].description}</div>
        `

    forecastCards.appendChild(forecastCard)
  })
}

function updateWeatherIcon(weatherId) {
  let iconClass = "fa-cloud-sun" // Padrão

  // Mapear códigos de clima para ícones Font Awesome
  if (weatherId >= 200 && weatherId < 300) {
    iconClass = "fa-bolt" // Tempestade
  } else if (weatherId >= 300 && weatherId < 400) {
    iconClass = "fa-cloud-rain" // Chuvisco
  } else if (weatherId >= 500 && weatherId < 600) {
    iconClass = "fa-cloud-showers-heavy" // Chuva
  } else if (weatherId >= 600 && weatherId < 700) {
    iconClass = "fa-snowflake" // Neve
  } else if (weatherId >= 700 && weatherId < 800) {
    iconClass = "fa-smog" // Atmosfera (névoa, etc)
  } else if (weatherId === 800) {
    iconClass = "fa-sun" // Céu limpo
  } else if (weatherId > 800) {
    iconClass = "fa-cloud" // Nublado
  }

  weatherIcon.className = `fas ${iconClass}`
}

function getWeatherIconHTML(weatherId) {
  let iconClass = "fa-cloud-sun" // Padrão

  // Mapear códigos de clima para ícones Font Awesome
  if (weatherId >= 200 && weatherId < 300) {
    iconClass = "fa-bolt" // Tempestade
  } else if (weatherId >= 300 && weatherId < 400) {
    iconClass = "fa-cloud-rain" // Chuvisco
  } else if (weatherId >= 500 && weatherId < 600) {
    iconClass = "fa-cloud-showers-heavy" // Chuva
  } else if (weatherId >= 600 && weatherId < 700) {
    iconClass = "fa-snowflake" // Neve
  } else if (weatherId >= 700 && weatherId < 800) {
    iconClass = "fa-smog" // Atmosfera (névoa, etc)
  } else if (weatherId === 800) {
    iconClass = "fa-sun" // Céu limpo
  } else if (weatherId > 800) {
    iconClass = "fa-cloud" // Nublado
  }

  return `<i class="fas ${iconClass}"></i>`
}

function formatDate(date) {
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }
  return date.toLocaleDateString("pt-BR", options)
}

function formatDay(date) {
  const options = { weekday: "short" }
  return date.toLocaleDateString("pt-BR", options)
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function showError(message) {
  errorMessage.textContent = message
  errorModal.classList.add("active")
}

function closeErrorModal() {
  errorModal.classList.remove("active")
}

function setLoadingState(isLoading) {
  if (isLoading) {
    cityName.classList.add("loading")
    cityName.textContent = "Carregando"
  } else {
    cityName.classList.remove("loading")
  }
}
