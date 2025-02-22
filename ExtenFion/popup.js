document.addEventListener('DOMContentLoaded', function() {
  // Éléments DOM
  const titleElement = document.getElementById('title');
  const imageElement = document.getElementById('image');
  const descriptionElement = document.getElementById('description');
  const urlElement = document.getElementById('url');
  const animeElement = document.getElementById('anime');
  const buttonElement = document.getElementById('new-recommendation');
  const loadingElement = document.getElementById('loading');
  const favoriteButton = document.getElementById('favorite-button');
  const genreFilter = document.getElementById('genre-filter');
  const ratingFilter = document.getElementById('rating-filter');

  // Gestion des onglets
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;
      
      // Mettre à jour les classes actives
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      button.classList.add('active');
      document.getElementById(tabId).classList.add('active');

      // Mettre à jour le contenu selon l'onglet
      if (tabId === 'favorites') {
        displayFavorites();
      } else if (tabId === 'history') {
        displayHistory();
      } else if (tabId === 'stats') {
        updateStats();
      }
    });
  });

  // Gestion des favoris
  let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  let history = JSON.parse(localStorage.getItem('history') || '[]');

  async function getAnimeFromAPI() {
    try {
      // Ajouter un délai pour respecter la limite de taux de l'API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const randomId = Math.floor(Math.random() * 50000) + 1;
      const response = await fetch(`https://api.jikan.moe/v4/anime/${randomId}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      // Vérifier si la réponse est ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.data) {
        return {
          title: data.data.title_french || data.data.title,
          description: data.data.synopsis || "Description non disponible",
          image: data.data.images?.jpg?.large_image_url || "image_par_defaut.jpg",
          url: data.data.url || "#",
          rating: data.data.score || 0,
          episodes: data.data.episodes || "?",
          year: data.data.year || "?",
          genres: data.data.genres?.map(genre => genre.name) || []
        };
      }
      throw new Error('Données d\'anime invalides');
    } catch (error) {
      console.error('Erreur API:', error);
      // Utiliser la fonction de fallback en cas d'erreur
      return getRandomAnime();
    }
  }

  async function getRandomAnime() {
    try {
      const response = await fetch('anime.json');
      const animeList = await response.json();
      const filteredList = animeList.filter(anime => {
        const genreMatch = !genreFilter.value || (anime.genres && anime.genres.includes(genreFilter.value));
        const ratingMatch = !ratingFilter.value || (anime.rating >= parseFloat(ratingFilter.value));
        return genreMatch && ratingMatch;
      });
      
      if (filteredList.length === 0) return animeList[Math.floor(Math.random() * animeList.length)];
      return filteredList[Math.floor(Math.random() * filteredList.length)];
    } catch (error) {
      console.error('Erreur JSON local:', error);
      throw error;
    }
  }

  async function displayRandomAnime() {
    try {
      loadingElement.style.display = 'block';
      
      const anime = Math.random() < 0.7 ? 
        await getAnimeFromAPI() : 
        await getRandomAnime();
      
      if (!anime.image || !anime.title) {
        throw new Error('Données d\'anime invalides');
      }

      // Mise à jour de l'interface
      titleElement.textContent = anime.title;
      imageElement.src = anime.image;
      descriptionElement.textContent = anime.description;
      urlElement.href = anime.url;
      
      // Mise à jour du bouton favori
      favoriteButton.classList.toggle('active', 
        favorites.some(fav => fav.title === anime.title)
      );

      // Ajouter à l'historique
      addToHistory(anime);

      // Mettre à jour les stats
      updateStats();

    } catch (error) {
      console.error('Erreur lors de l\'affichage de l\'anime:', error);
      handleError(error);
    } finally {
      loadingElement.style.display = 'none';
    }
  }

  function addToHistory(anime) {
    history = [anime, ...history.filter(h => h.title !== anime.title)].slice(0, 20);
    localStorage.setItem('history', JSON.stringify(history));
  }

  function toggleFavorite(anime) {
    const index = favorites.findIndex(fav => fav.title === anime.title);
    if (index === -1) {
      favorites.push(anime);
      favoriteButton.classList.add('active');
    } else {
      favorites.splice(index, 1);
      favoriteButton.classList.remove('active');
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateStats();
  }

  function displayFavorites() {
    const container = document.getElementById('favorites-list');
    container.innerHTML = favorites.map(anime => createAnimeCard(anime)).join('');
  }

  function displayHistory() {
    const container = document.getElementById('history-list');
    container.innerHTML = history.map(anime => createAnimeCard(anime)).join('');
  }

  function createAnimeCard(anime) {
    return `
      <div class="grid-item">
        <img src="${anime.image}" alt="${anime.title}">
        <h3>${anime.title}</h3>
        <p>${anime.rating ? '⭐ ' + anime.rating : ''}</p>
      </div>
    `;
  }

  function updateStats() {
    const totalWatched = document.getElementById('total-watched');
    const favoriteGenre = document.getElementById('favorite-genre');
    const averageRating = document.getElementById('average-rating');

    // Calculer les statistiques
    totalWatched.textContent = history.length;

    const genres = history.flatMap(anime => anime.genres || []);
    const genreCounts = genres.reduce((acc, genre) => {
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    }, {});
    
    const topGenre = Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)[0];
    favoriteGenre.textContent = topGenre ? topGenre[0] : '-';

    const ratings = history.map(anime => anime.rating).filter(Boolean);
    const avg = ratings.length ? 
      (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 
      '0';
    averageRating.textContent = avg;
  }

  // Gestionnaire d'erreur
  function handleError(error) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-message';
    errorContainer.textContent = `Erreur: ${error.message}. Utilisation des données locales.`;
    document.body.appendChild(errorContainer);
    setTimeout(() => errorContainer.remove(), 3000);
  }

  // Event Listeners
  buttonElement.addEventListener('click', displayRandomAnime);
  favoriteButton.addEventListener('click', () => {
    const currentAnime = {
      title: titleElement.textContent,
      image: imageElement.src,
      rating: parseFloat(document.getElementById('rating').textContent)
    };
    toggleFavorite(currentAnime);
  });

  [genreFilter, ratingFilter].forEach(filter => {
    filter.addEventListener('change', displayRandomAnime);
  });

  // Initialisation
  displayRandomAnime();
});
