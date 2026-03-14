import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";

// Export app for Vercel serverless functions
export const app = express();
app.use(cors());

async function getAnimeDetails(anilistId: number) {
  const query = `
    query ($id: Int) {
      Media (id: $id, type: ANIME) {
        title {
          romaji
          english
          native
        }
        format
        startDate {
          year
        }
      }
    }
  `;
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { id: anilistId }
    })
  });
  const data = await response.json();
  if (data.errors) {
    throw new Error(data.errors[0].message);
  }
  return data.data.Media;
}

async function searchKaido(animeDetails: any) {
  const title = animeDetails.title.english || animeDetails.title.romaji || animeDetails.title.native;
  console.log('Searching Kaido for:', title);
  const response = await fetch(`https://kaido-api-six.vercel.app/api/search?keyword=${encodeURIComponent(title)}`);
  const data = await response.json();
  console.log('Kaido search response:', JSON.stringify(data).substring(0, 200));
  if (!data.results || !data.results.data || data.results.data.length === 0) {
    throw new Error('Anime not found in Kaido');
  }

  const results = data.results.data;
  
  // Try to find the best match based on format
  let expectedFormat = '';
  if (animeDetails.format === 'TV' || animeDetails.format === 'TV_SHORT') expectedFormat = 'TV';
  else if (animeDetails.format === 'MOVIE') expectedFormat = 'Movie';
  else if (animeDetails.format === 'SPECIAL') expectedFormat = 'Special';
  else if (animeDetails.format === 'OVA') expectedFormat = 'OVA';
  else if (animeDetails.format === 'ONA') expectedFormat = 'ONA';

  let bestMatch = results[0]; // Default to first result
  
  if (expectedFormat) {
    const formatMatches = results.filter((r: any) => r.tvInfo?.showType === expectedFormat);
    if (formatMatches.length > 0) {
      // If we have format matches, try to find an exact title match among them
      const exactMatch = formatMatches.find((r: any) => 
        r.title.toLowerCase() === animeDetails.title.english?.toLowerCase() ||
        r.title.toLowerCase() === animeDetails.title.romaji?.toLowerCase() ||
        r.jname.toLowerCase() === animeDetails.title.romaji?.toLowerCase()
      );
      bestMatch = exactMatch || formatMatches[0];
    }
  }

  console.log('Selected Kaido match:', bestMatch.title, '(', bestMatch.id, ')');
  return bestMatch.id;
}

async function getEpisodeId(kaidoId: string, epNum: number) {
  console.log('Getting episodes for Kaido ID:', kaidoId);
  const response = await fetch(`https://kaido-api-six.vercel.app/api/episodes/${kaidoId}`);
  const data = await response.json();
  console.log('Kaido episodes response:', JSON.stringify(data).substring(0, 200));
  if (!data.results || !data.results.episodes || data.results.episodes.length === 0) {
    throw new Error('No episodes found');
  }
  const episode = data.results.episodes.find((ep: any) => ep.episode_no === epNum);
  if (!episode) {
    throw new Error(`Episode ${epNum} not found`);
  }
  return episode.id;
}

async function getStreamInfo(episodeId: string, type: string) {
  const response = await fetch(`https://kaido-api-six.vercel.app/api/stream?id=${episodeId}&server=hd-2&type=${type}`);
  const data = await response.json();
  return data;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/stream", async (req, res) => {
  try {
    let idStr = req.query.id as string;
    let epStr = req.query.ep as string;
    let typeStr = req.query.type as string;

    // Handle the format: /api/stream?id=172463&1&dub
    if (!epStr || !typeStr) {
      const keys = Object.keys(req.query);
      for (const key of keys) {
        if (key !== 'id') {
          if (!isNaN(parseInt(key, 10))) {
            epStr = key;
          } else if (key === 'sub' || key === 'dub') {
            typeStr = key;
          }
        }
      }
    }

    const id = parseInt(idStr, 10);
    const ep = parseInt(epStr, 10);
    const type = typeStr || 'sub';

    if (isNaN(id) || isNaN(ep)) {
      res.status(400).json({ error: "Invalid id or ep parameters" });
      return;
    }

    const animeDetails = await getAnimeDetails(id);
    const kaidoId = await searchKaido(animeDetails);
    const episodeId = await getEpisodeId(kaidoId, ep);
    const streamInfo = await getStreamInfo(episodeId, type);

    res.json(streamInfo);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
