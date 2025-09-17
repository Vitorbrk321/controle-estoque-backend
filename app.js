require('dotenv').config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // quantas conexões simultâneas no máximo
  queueLimit: 0,
  connectTimeout: 10000
  
});

// Rota: Listar todos os produtos
app.get("/produtos", (req, res) => {
  db.query("SELECT * FROM produtos", (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// Rota: Adicionar novo produto
app.post("/produtos", (req, res) => {
  const { nome, quantidade } = req.body;
  const sqlInsert = "INSERT INTO produtos (nome, quantidade) VALUES (?, ?)";
  db.query(sqlInsert, [nome, quantidade], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao adicionar produto" });
    }
    res.status(200).json({ status: "Produto adicionado com sucesso" });
  });
});

// Rota: Atualizar produto (PUT)
app.put("/produtos/:id", (req, res) => {
  const { id } = req.params;
  const { nome, quantidade } = req.body;

  const sqlUpdate = "UPDATE produtos SET nome = ?, quantidade = ? WHERE id = ?";
  db.query(sqlUpdate, [nome, quantidade, id], (err, result) => {
    if (err) {
      console.error("Erro ao atualizar produto:", err);
      return res.status(500).json({ error: "Erro ao atualizar produto" });
    }
    res.status(200).json({ status: "Produto atualizado com sucesso" });
  });
});

// Rota: Deletar produto
app.delete("/produtos/:id", (req, res) => {
    const { id } = req.params;

    const sqlDelete = "DELETE FROM produtos WHERE id = ?";
    db.query(sqlDelete, [id], (err, result) => {
        if (err) {
            console.error("Erro ao deletar produto:", err);
            return res.status(500).json({ error: "Erro ao deletar produto" });
        }
        res.status(200).json({ status: "Produto deletado com sucesso" });
    });
});


// Rota: Realizar movimentação (entrada/saída)
app.post("/movimentacao", (req, res) => {
  const { produto_id, usuario, tipo, quantidade, descricao } = req.body;

  const sqlUpdate = `UPDATE produtos SET quantidade = quantidade ${tipo === 'entrada' ? '+' : '-'} ? WHERE id = ?`;
  db.query(sqlUpdate, [quantidade, produto_id], (err, result) => {
    if (err) {
      console.error("Erro ao atualizar quantidade:", err);
      return res.status(500).json({ error: "Erro ao atualizar produto" });
    }

    const sqlInsert = `
      INSERT INTO movimentacoes 
      (produto_id, usuario, tipo, quantidade, descricao, data) 
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    db.query(sqlInsert, [produto_id, usuario, tipo, quantidade, descricao || null], (err, result) => {
      if (err) {
        console.error("Erro ao registrar movimentação:", err);
        return res.status(500).json({ error: "Erro ao registrar movimentação" });
      }

      res.status(200).json({ status: "Movimentação registrada com sucesso" });
    });
  });
});

// Rota: Listar todas as movimentações com nome do produto
app.get("/movimentacoes", (req, res) => {
  const sql = `
    SELECT 
      m.id,
      m.produto_id,
      m.tipo,
      m.quantidade,
      m.usuario,
      m.descricao,
      m.data,
      p.nome AS produto_nome
    FROM movimentacoes m
    JOIN produtos p ON m.produto_id = p.id
    ORDER BY m.data DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar movimentações:", err);
      return res.status(500).json({ error: "Erro ao buscar movimentações" });
    }
    res.json(results);
  });
});

// Rota: Login
app.post('/login', (req, res) => {
  const { usuario, senha } = req.body;

  db.query(
    'SELECT * FROM usuarios WHERE usuario = ? AND senha = ?',
    [usuario, senha],
    (err, results) => {
      if (err) {
        console.error('Erro ao realizar login:', err);
        return res.status(500).json({ error: 'Erro interno no servidor' });
      }

      if (results.length > 0) {
        res.json({ success: true, user: results[0] });
      } else {
        res.status(401).json({ error: 'Usuário ou senha incorretos' });
      }
    }
  );
});


// Iniciar servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));