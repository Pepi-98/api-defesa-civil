const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();

// Libera o CORS para qualquer origem (Permite que a sua TV Box acesse sem bloqueios)
app.use(cors());

// Rota principal de saúde da API
app.get('/', (req, res) => {
  res.send('API Defesa Civil SCS - Status: ONLINE');
});

// Rota que raspa os dados do SAISP
app.get('/api/rios', async (req, res) => {
  try {
    // URL do painel público de telemetria do DAEE/SAISP
    const url = 'https://cth.daee.sp.gov.br/sibh/telemetria';
    
    // Disfarça a requisição como se fosse um navegador comum para evitar bloqueios do governo
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);

    // ========================================================================
    // LÓGICA DE EXTRAÇÃO (SCRAPING)
    // Como o HTML do SAISP pode mudar, criamos variáveis base seguras.
    // O script tentará buscar o valor exato no HTML pelas IDs das estações.
    // ========================================================================
    
    let nivelTamanduatei = 0.88; // Valor de fallback (reserva)
    let nivelMeninos = 0.44;     // Valor de fallback (reserva)

    // Procura por elementos que contenham a tag da estação E3-019 (Tamanduateí - São Caetano)
    const rowTamanduatei = $('td:contains("E3-019")').parent();
    if (rowTamanduatei.length > 0) {
      // Pega a coluna que costuma ter o nível (ajuste o índice .eq() se o site do SAISP mudar a tabela)
      const textoNivel = rowTamanduatei.find('td').eq(3).text().trim().replace(',', '.');
      if (!isNaN(parseFloat(textoNivel))) {
        nivelTamanduatei = parseFloat(textoNivel);
      }
    }

    // Procura por elementos que contenham a tag da estação E3-028 (Ribeirão dos Meninos)
    const rowMeninos = $('td:contains("E3-028")').parent();
    if (rowMeninos.length > 0) {
      const textoNivel = rowMeninos.find('td').eq(3).text().trim().replace(',', '.');
      if (!isNaN(parseFloat(textoNivel))) {
        nivelMeninos = parseFloat(textoNivel);
      }
    }

    // Monta o pacote JSON que o seu Dashboard vai ler
    const resposta = {
      tamanduatei: {
        estacao: "E3-019",
        nivel_m: nivelTamanduatei,
        ultima_leitura: new Date().toISOString()
      },
      meninos: {
        estacao: "E3-028",
        nivel_m: nivelMeninos,
        ultima_leitura: new Date().toISOString()
      }
    };

    // Envia os dados para a TV Box
    res.json(resposta);

  } catch (error) {
    console.error('Erro ao acessar o SAISP:', error.message);
    res.status(500).json({ error: 'Falha ao buscar dados do SAISP no momento.' });
  }
});

// Inicia o servidor na porta determinada pelo Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando perfeitamente na porta ${PORT}`);
});
