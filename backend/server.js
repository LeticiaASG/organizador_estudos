import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const DIAS_VALIDOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function normalizarHoraSql(valor) {
  if (!valor || typeof valor !== 'string') return null;
  const limpo = valor.trim();
  if (!limpo) return null;
  if (/^\d{2}:\d{2}$/.test(limpo)) return `${limpo}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(limpo)) return limpo;
  return null;
}

function formatarHoraCurta(valor) {
  if (!valor) return '';
  return String(valor).slice(0, 5);
}

function formatarHorarioSalvo(valor) {
  if (!valor) return '00:00';
  return String(valor).slice(0, 5);
}

async function buscarMateriasCompletasPorUsuario(usuarioId) {
  const [materiasRows] = await db.query(
    `SELECT id, usuario_id, nome, conteudo, hora_inicio, hora_fim, concluida, data_cadastro
     FROM materias
     WHERE usuario_id = ?
     ORDER BY id DESC`,
    [usuarioId]
  );

  if (materiasRows.length === 0) {
    return [];
  }

  const ids = materiasRows.map((m) => m.id);
  const placeholders = ids.map(() => '?').join(',');

  const [diasRows] = await db.query(
    `SELECT materia_id, dia_semana
     FROM materia_dias
     WHERE materia_id IN (${placeholders})`,
    ids
  );

  const [anotacoesRows] = await db.query(
    `SELECT materia_id, texto, horario_salvo, data_atualizacao
     FROM anotacoes
     WHERE materia_id IN (${placeholders})`,
    ids
  );

  const diasPorMateria = new Map();
  for (const row of diasRows) {
    if (!diasPorMateria.has(row.materia_id)) {
      diasPorMateria.set(row.materia_id, []);
    }
    diasPorMateria.get(row.materia_id).push(row.dia_semana);
  }

  const anotacaoPorMateria = new Map();
  for (const row of anotacoesRows) {
    anotacaoPorMateria.set(row.materia_id, row);
  }

  return materiasRows.map((m) => {
    const diasBrutos = diasPorMateria.get(m.id) || [];
    const diasOrdenados = DIAS_VALIDOS.filter((d) => diasBrutos.includes(d));
    const anot = anotacaoPorMateria.get(m.id);

    return {
      id: m.id,
      usuario_id: m.usuario_id,
      nome: m.nome,
      conteudo: m.conteudo,
      dias: diasOrdenados,
      inicio: formatarHoraCurta(m.hora_inicio),
      fim: formatarHoraCurta(m.hora_fim),
      concluida: Boolean(m.concluida),
      anotacao: anot ? anot.texto : '',
      salvoEm: anot ? formatarHorarioSalvo(anot.horario_salvo) : '00:00',
    };
  });
}

async function sincronizarDiasMateria(conexao, materiaId, dias) {
  await conexao.query('DELETE FROM materia_dias WHERE materia_id = ?', [materiaId]);

  if (!Array.isArray(dias)) return;

  const diasUnicosValidos = [...new Set(dias)].filter((d) => DIAS_VALIDOS.includes(d));

  for (const dia of diasUnicosValidos) {
    await conexao.query(
      'INSERT INTO materia_dias (materia_id, dia_semana) VALUES (?, ?)',
      [materiaId, dia]
    );
  }
}

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true, mensagem: 'Servidor e banco foco conectados!' });
  } catch (erro) {
    console.error('Erro ao conectar no banco:', erro);
    res.status(500).json({ ok: false, erro: 'Falha na conexão com o banco' });
  }
});

// Cadastro de usuário na tabela usuarios
app.post('/usuarios', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        ok: false,
        erro: 'Preencha nome, email e senha.',
      });
    }

    const [resultado] = await db.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      [nome, email, senha]
    );

    res.status(201).json({
      ok: true,
      mensagem: 'Usuário cadastrado com sucesso!',
      id: resultado.insertId,
      usuario: {
        id: resultado.insertId,
        nome,
        email,
      },
    });
  } catch (erro) {
    console.error('Erro ao cadastrar usuário:', erro);
    if (erro.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        ok: false,
        erro: 'Este e-mail já está cadastrado.',
      });
    }
    res.status(500).json({
      ok: false,
      erro: 'Erro ao cadastrar usuário no banco.',
    });
  }
});

// Login de usuário na tabela usuarios
app.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        ok: false,
        erro: 'Preencha email e senha.',
      });
    }

    const [usuarios] = await db.query(
      'SELECT id, nome, email, data_cadastro FROM usuarios WHERE email = ? AND senha = ?',
      [email, senha]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        ok: false,
        erro: 'Email ou senha inválidos.',
      });
    }

    res.json({
      ok: true,
      mensagem: 'Login efetuado com sucesso!',
      usuario: usuarios[0],
    });
  } catch (erro) {
    console.error('Erro ao fazer login:', erro);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao verificar login no banco.',
    });
  }
});

// Listar matérias (com dias e anotações) de um usuário
app.get('/materias', async (req, res) => {
  try {
    const usuarioId = Number(req.query.usuarioId);
    if (!usuarioId) {
      return res.status(400).json({
        ok: false,
        erro: 'Informe usuarioId na consulta.',
      });
    }

    const materias = await buscarMateriasCompletasPorUsuario(usuarioId);
    res.json({ ok: true, materias });
  } catch (erro) {
    console.error('Erro ao buscar matérias:', erro);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao carregar matérias do banco.',
    });
  }
});

// Criar nova matéria + dias da semana + anotação inicial
app.post('/materias', async (req, res) => {
  const conexao = await db.getConnection();
  try {
    const { usuarioId, nome, conteudo, inicio, fim, dias } = req.body;

    if (!usuarioId || !nome || !conteudo) {
      return res.status(400).json({
        ok: false,
        erro: 'Preencha usuarioId, nome e conteúdo da matéria.',
      });
    }

    const horaInicioSql = normalizarHoraSql(inicio);
    const horaFimSql = normalizarHoraSql(fim);

    await conexao.beginTransaction();

    const [resultado] = await conexao.query(
      `INSERT INTO materias (usuario_id, nome, conteudo, hora_inicio, hora_fim, concluida)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [Number(usuarioId), String(nome).trim(), String(conteudo).trim(), horaInicioSql, horaFimSql]
    );

    const novaMateriaId = resultado.insertId;

    await sincronizarDiasMateria(conexao, novaMateriaId, dias);

    await conexao.query(
      `INSERT INTO anotacoes (materia_id, texto, horario_salvo)
       VALUES (?, '', '00:00')`,
      [novaMateriaId]
    );

    await conexao.commit();

    const listaAtualizada = await buscarMateriasCompletasPorUsuario(Number(usuarioId));
    const materiaCriada = listaAtualizada.find((m) => m.id === novaMateriaId);

    res.status(201).json({
      ok: true,
      mensagem: 'Matéria salva com sucesso!',
      materia: materiaCriada,
    });
  } catch (erro) {
    await conexao.rollback();
    console.error('Erro ao criar matéria:', erro);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao salvar matéria no banco.',
    });
  } finally {
    conexao.release();
  }
});

// Editar matéria existente (nome, conteúdo, horários e dias da semana)
app.put('/materias/:id', async (req, res) => {
  const conexao = await db.getConnection();
  try {
    const materiaId = Number(req.params.id);
    const { usuarioId, nome, conteudo, inicio, fim, dias, concluida } = req.body;

    if (!materiaId || !usuarioId || !nome || !conteudo) {
      return res.status(400).json({
        ok: false,
        erro: 'Dados incompletos para atualizar a matéria.',
      });
    }

    const [existentes] = await conexao.query(
      'SELECT id, concluida FROM materias WHERE id = ? AND usuario_id = ?',
      [materiaId, Number(usuarioId)]
    );

    if (existentes.length === 0) {
      return res.status(404).json({
        ok: false,
        erro: 'Matéria não encontrada para este usuário.',
      });
    }

    const horaInicioSql = normalizarHoraSql(inicio);
    const horaFimSql = normalizarHoraSql(fim);
    const statusConcluida =
      typeof concluida === 'boolean' ? (concluida ? 1 : 0) : existentes[0].concluida;

    await conexao.beginTransaction();

    await conexao.query(
      `UPDATE materias
       SET nome = ?, conteudo = ?, hora_inicio = ?, hora_fim = ?, concluida = ?
       WHERE id = ? AND usuario_id = ?`,
      [
        String(nome).trim(),
        String(conteudo).trim(),
        horaInicioSql,
        horaFimSql,
        statusConcluida,
        materiaId,
        Number(usuarioId),
      ]
    );

    await sincronizarDiasMateria(conexao, materiaId, dias);

    await conexao.commit();

    const listaAtualizada = await buscarMateriasCompletasPorUsuario(Number(usuarioId));
    const materiaAtualizada = listaAtualizada.find((m) => m.id === materiaId);

    res.json({
      ok: true,
      mensagem: 'Matéria atualizada com sucesso!',
      materia: materiaAtualizada,
    });
  } catch (erro) {
    await conexao.rollback();
    console.error('Erro ao atualizar matéria:', erro);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao atualizar matéria no banco.',
    });
  } finally {
    conexao.release();
  }
});

// Alternar status concluída/pendente da matéria
app.patch('/materias/:id/conclusao', async (req, res) => {
  try {
    const materiaId = Number(req.params.id);
    const { usuarioId, concluida } = req.body;

    if (!materiaId || !usuarioId || typeof concluida !== 'boolean') {
      return res.status(400).json({
        ok: false,
        erro: 'Informe materiaId, usuarioId e concluida (booleano).',
      });
    }

    const [resultado] = await db.query(
      'UPDATE materias SET concluida = ? WHERE id = ? AND usuario_id = ?',
      [concluida ? 1 : 0, materiaId, Number(usuarioId)]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        erro: 'Matéria não encontrada.',
      });
    }

    res.json({
      ok: true,
      concluida,
    });
  } catch (erro) {
    console.error('Erro ao alterar conclusão:', erro);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao atualizar status da matéria.',
    });
  }
});

// Excluir matéria (cascata remove materia_dias e anotacoes)
app.delete('/materias/:id', async (req, res) => {
  try {
    const materiaId = Number(req.params.id);
    const usuarioId = Number(req.query.usuarioId || req.body?.usuarioId);

    if (!materiaId || !usuarioId) {
      return res.status(400).json({
        ok: false,
        erro: 'Informe o id da matéria e o usuarioId.',
      });
    }

    const [resultado] = await db.query(
      'DELETE FROM materias WHERE id = ? AND usuario_id = ?',
      [materiaId, usuarioId]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        erro: 'Matéria não encontrada.',
      });
    }

    res.json({
      ok: true,
      mensagem: 'Matéria excluída com sucesso!',
    });
  } catch (erro) {
    console.error('Erro ao excluir matéria:', erro);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao excluir matéria no banco.',
    });
  }
});

// Criar ou atualizar anotação de uma matéria
app.put('/materias/:id/anotacao', async (req, res) => {
  try {
    const materiaId = Number(req.params.id);
    const { usuarioId, texto, horarioSalvo } = req.body;

    if (!materiaId || !usuarioId) {
      return res.status(400).json({
        ok: false,
        erro: 'Informe o id da matéria e o usuarioId.',
      });
    }

    const [materias] = await db.query(
      'SELECT id FROM materias WHERE id = ? AND usuario_id = ?',
      [materiaId, Number(usuarioId)]
    );

    if (materias.length === 0) {
      return res.status(404).json({
        ok: false,
        erro: 'Matéria não encontrada para este usuário.',
      });
    }

    const textoNormalizado = texto == null ? '' : String(texto);
    const horaLimpa = String(horarioSalvo || '00:00').slice(0, 5);

    await db.query(
      `INSERT INTO anotacoes (materia_id, texto, horario_salvo)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         texto = VALUES(texto),
         horario_salvo = VALUES(horario_salvo)`,
      [materiaId, textoNormalizado, horaLimpa]
    );

    res.json({
      ok: true,
      anotacao: textoNormalizado,
      salvoEm: horaLimpa,
    });
  } catch (erro) {
    console.error('Erro ao salvar anotação:', erro);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao salvar anotação no banco.',
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});