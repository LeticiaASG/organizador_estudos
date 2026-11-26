import { useState, useEffect } from 'react'
import './App.css'

const API_URL = 'http://localhost:3001'
const diasDaSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function pegarHoraAgora() {
  const agora = new Date()
  const horas = String(agora.getHours()).padStart(2, '0')
  const minutos = String(agora.getMinutes()).padStart(2, '0')
  return horas + ':' + minutos
}

function mostrarAmPm(hora24) {
  if (!hora24) {
    return ''
  }
  const partes = hora24.split(':')
  const hora = Number(partes[0])
  const minuto = partes[1]

  if (hora >= 12) {
    const hora12 = hora === 12 ? 12 : hora - 12
    return String(hora12).padStart(2, '0') + ':' + minuto + ' PM'
  } else {
    const hora12 = hora === 0 ? 12 : hora
    return String(hora12).padStart(2, '0') + ':' + minuto + ' AM'
  }
}

function App() {
  // Login e cadastro
  const [logado, setLogado] = useState(false)
  const [usuarioId, setUsuarioId] = useState(null)
  const [telaAuth, setTelaAuth] = useState('login') // 'login' ou 'cadastro'
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [nomeCadastro, setNomeCadastro] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mensagemAuth, setMensagemAuth] = useState('')

  // Abas e filtro
  const [aba, setAba] = useState('materias') // 'materias', 'nova' ou 'anotacoes'
  const [filtro, setFiltro] = useState('todas') // 'todas', 'pendentes' ou 'concluidas'

  // Lista de matérias e matéria aberta nas anotações
  const [materias, setMaterias] = useState([])
  const [materiaSelecionadaId, setMateriaSelecionadaId] = useState(null)
  const [editandoMateriaId, setEditandoMateriaId] = useState(null)

  // Campos de Nova matéria / Edição
  const [nomeMateria, setNomeMateria] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [diasEscolhidos, setDiasEscolhidos] = useState([])
  const [mensagemErro, setMensagemErro] = useState('')

  async function carregarMaterias(idUsuario) {
    if (!idUsuario) return
    try {
      const resposta = await fetch(`${API_URL}/materias?usuarioId=${idUsuario}`)
      const dados = await resposta.json()
      if (resposta.ok && dados.ok && Array.isArray(dados.materias)) {
        setMaterias(dados.materias)
        if (dados.materias.length > 0) {
          setMateriaSelecionadaId(function (atual) {
            const aindaExiste = dados.materias.some((m) => m.id === atual)
            return aindaExiste ? atual : dados.materias[0].id
          })
        } else {
          setMateriaSelecionadaId(null)
        }
      }
    } catch {
      setMensagemErro('Não foi possível carregar as matérias do banco.')
    }
  }

  useEffect(
    function () {
      if (logado && usuarioId) {
        carregarMaterias(usuarioId)
      }
    },
    [logado, usuarioId]
  )

  async function entrarOuCadastrar(evento) {
    evento.preventDefault()
    setMensagemAuth('')
    setMensagemErro('')

    const ehCadastro = telaAuth === 'cadastro'
    const rota = ehCadastro ? '/usuarios' : '/login'
    const corpo = ehCadastro
      ? { nome: nomeCadastro.trim(), email: email.trim(), senha }
      : { email: email.trim(), senha }

    try {
      const resposta = await fetch(`${API_URL}${rota}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })

      const textoResposta = await resposta.text()
      let dados = {}
      if (textoResposta) {
        try {
          dados = JSON.parse(textoResposta)
        } catch {
          dados = { mensagem: textoResposta }
        }
      }

      if (!resposta.ok) {
        setMensagemAuth(dados.erro || dados.mensagem || 'E-mail ou senha inválidos.')
        return
      }

      const idEncontrado = (dados.usuario && dados.usuario.id) || dados.id || null
      if (!idEncontrado) {
        setMensagemAuth('Login feito, mas o servidor não retornou o ID do usuário.')
        return
      }

      const nomeBase =
        (dados.usuario && dados.usuario.nome) ||
        dados.nome ||
        (ehCadastro ? nomeCadastro.trim() : '') ||
        email.trim().split('@')[0]

      setUsuarioId(Number(idEncontrado))
      setNomeUsuario(String(nomeBase).trim().split(' ')[0])
      setLogado(true)
      setAba('materias')
    } catch {
      setMensagemAuth('Não foi possível conectar ao servidor em http://localhost:3001.')
    }
  }

  function sair() {
    setLogado(false)
    setUsuarioId(null)
    setMaterias([])
    setMateriaSelecionadaId(null)
    setEditandoMateriaId(null)
    setTelaAuth('login')
    setSenha('')
    setMensagemAuth('')
    setMensagemErro('')
  }

  function limparFormulario() {
    setEditandoMateriaId(null)
    setNomeMateria('')
    setConteudo('')
    setInicio('')
    setFim('')
    setDiasEscolhidos([])
  }

  function clicarDia(dia) {
    if (diasEscolhidos.includes(dia)) {
      const novaLista = diasEscolhidos.filter(function (item) {
        return item !== dia
      })
      setDiasEscolhidos(novaLista)
    } else {
      setDiasEscolhidos([...diasEscolhidos, dia])
    }
  }

  function iniciarEdicao(materia) {
    setEditandoMateriaId(materia.id)
    setNomeMateria(materia.nome)
    setConteudo(materia.conteudo)
    setInicio(materia.inicio || '')
    setFim(materia.fim || '')
    setDiasEscolhidos(Array.isArray(materia.dias) ? materia.dias : [])
    setMensagemErro('')
    setAba('nova')
  }

  async function salvarNovaMateria(evento) {
    evento.preventDefault()
    setMensagemErro('')

    if (nomeMateria.trim() === '' || conteudo.trim() === '' || !usuarioId) {
      return
    }

    const payload = {
      usuarioId,
      nome: nomeMateria.trim(),
      conteudo: conteudo.trim(),
      dias: diasEscolhidos,
      inicio: inicio,
      fim: fim,
    }

    try {
      const estaEditando = editandoMateriaId !== null
      const url = estaEditando
        ? `${API_URL}/materias/${editandoMateriaId}`
        : `${API_URL}/materias`
      const metodo = estaEditando ? 'PUT' : 'POST'

      const resposta = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const dados = await resposta.json()

      if (!resposta.ok || !dados.ok || !dados.materia) {
        setMensagemErro(dados.erro || 'Erro ao salvar matéria no banco.')
        return
      }

      if (estaEditando) {
        setMaterias(
          materias.map(function (m) {
            return m.id === dados.materia.id ? dados.materia : m
          })
        )
        setMateriaSelecionadaId(dados.materia.id)
      } else {
        setMaterias([dados.materia, ...materias])
        setMateriaSelecionadaId(dados.materia.id)
      }

      limparFormulario()
      setAba('materias')
    } catch {
      setMensagemErro('Erro de conexão ao salvar matéria.')
    }
  }

  async function alternarConclusao(id) {
    const materiaAlvo = materias.find((m) => m.id === id)
    if (!materiaAlvo || !usuarioId) return

    const novoEstado = !materiaAlvo.concluida

    try {
      const resposta = await fetch(`${API_URL}/materias/${id}/conclusao`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId,
          concluida: novoEstado,
        }),
      })

      const dados = await resposta.json()
      if (!resposta.ok || !dados.ok) {
        setMensagemErro(dados.erro || 'Erro ao atualizar conclusão.')
        return
      }

      setMaterias(
        materias.map(function (materia) {
          if (materia.id === id) {
            return {
              ...materia,
              concluida: novoEstado,
            }
          }
          return materia
        })
      )
    } catch {
      setMensagemErro('Erro de conexão ao atualizar conclusão.')
    }
  }

  async function excluirMateria(id) {
    if (!usuarioId) return

    try {
      const resposta = await fetch(
        `${API_URL}/materias/${id}?usuarioId=${usuarioId}`,
        { method: 'DELETE' }
      )
      const dados = await resposta.json()

      if (!resposta.ok || !dados.ok) {
        setMensagemErro(dados.erro || 'Erro ao excluir matéria.')
        return
      }

      const listaSemItem = materias.filter(function (materia) {
        return materia.id !== id
      })
      setMaterias(listaSemItem)

      if (editandoMateriaId === id) {
        limparFormulario()
      }

      if (materiaSelecionadaId === id) {
        setMateriaSelecionadaId(listaSemItem.length > 0 ? listaSemItem[0].id : null)
      }
    } catch {
      setMensagemErro('Erro de conexão ao excluir matéria.')
    }
  }

  function abrirAnotacaoDaMateria(id) {
    setMateriaSelecionadaId(id)
    setAba('anotacoes')
  }

  async function mudarAnotacao(novoTexto) {
    if (!materiaSelecionadaId || !usuarioId) return

    const hora = pegarHoraAgora()
    setMaterias(
      materias.map(function (materia) {
        if (materia.id === materiaSelecionadaId) {
          return {
            ...materia,
            anotacao: novoTexto,
            salvoEm: hora,
          }
        }
        return materia
      })
    )

    try {
      const resposta = await fetch(
        `${API_URL}/materias/${materiaSelecionadaId}/anotacao`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuarioId,
            texto: novoTexto,
            horarioSalvo: hora,
          }),
        }
      )

      const dados = await resposta.json()
      if (resposta.ok && dados.ok) {
        setMaterias(function (prev) {
          return prev.map(function (m) {
            if (m.id === materiaSelecionadaId) {
              return {
                ...m,
                anotacao: dados.anotacao,
                salvoEm: dados.salvoEm || hora,
              }
            }
            return m
          })
        })
      }
    } catch {
      setMensagemErro('Erro ao salvar anotação no banco.')
    }
  }

  // Tela de Login / Criar conta
  if (!logado) {
    return (
      <div className="tela-login">
        <div className="cartao-login">
          <div className="topo-marca">
            <span className="quadrado-logo"></span>
            <span className="nome-logo">Foco</span>
          </div>

          <div className="caixa-abas dois-botoes">
            <button
              type="button"
              className={telaAuth === 'login' ? 'aba ativa' : 'aba'}
              onClick={function () {
                setTelaAuth('login')
                setMensagemAuth('')
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              className={telaAuth === 'cadastro' ? 'aba ativa' : 'aba'}
              onClick={function () {
                setTelaAuth('cadastro')
                setMensagemAuth('')
              }}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={entrarOuCadastrar} className="formulario">
            {telaAuth === 'cadastro' && (
              <div className="campo">
                <label>Nome</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={nomeCadastro}
                  onChange={function (e) {
                    setNomeCadastro(e.target.value)
                  }}
                  required
                />
              </div>
            )}

            <div className="campo">
              <label>E-mail</label>
              <input
                type="email"
                placeholder="voce@email.com"
                value={email}
                onChange={function (e) {
                  setEmail(e.target.value)
                }}
                required
              />
            </div>

            <div className="campo">
              <label>Senha</label>
              <input
                type="password"
                placeholder={telaAuth === 'cadastro' ? 'Mínimo 6 caracteres' : 'Sua senha'}
                value={senha}
                onChange={function (e) {
                  setSenha(e.target.value)
                }}
                required
              />
            </div>

            {mensagemAuth && <p className="mensagem-erro">{mensagemAuth}</p>}

            <button type="submit" className="botao-roxo">
              {telaAuth === 'login' ? 'Entrar' : 'Criar minha conta'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Contadores e filtro
  const totalMaterias = materias.length
  const concluidas = materias.filter(function (m) {
    return m.concluida === true
  })
  const pendentes = materias.filter(function (m) {
    return m.concluida === false
  })

  const totalConcluidas = concluidas.length
  const totalPendentes = pendentes.length
  const porcentagem = totalMaterias > 0 ? (totalConcluidas / totalMaterias) * 100 : 0

  let materiasFiltradas = materias
  if (filtro === 'pendentes') {
    materiasFiltradas = pendentes
  }
  if (filtro === 'concluidas') {
    materiasFiltradas = concluidas
  }

  let materiaAtual = materias.find(function (m) {
    return m.id === materiaSelecionadaId
  })
  if (!materiaAtual && materias.length > 0) {
    materiaAtual = materias[0]
  }

  return (
    <div className="pagina">
      <header className="cabecalho">
        <div className="topo-marca">
          <span className="quadrado-logo"></span>
          <span className="nome-logo">Foco</span>
        </div>

        <div className="area-usuario">
          <span className="texto-ola">Olá, {nomeUsuario}</span>
          <button type="button" className="botao-borda" onClick={sair}>
            Sair
          </button>
        </div>
      </header>

      <nav className="caixa-abas tres-botoes">
        <button
          type="button"
          className={aba === 'materias' ? 'aba ativa' : 'aba'}
          onClick={function () {
            setAba('materias')
          }}
        >
          Minhas matérias
        </button>
        <button
          type="button"
          className={aba === 'nova' ? 'aba ativa' : 'aba'}
          onClick={function () {
            limparFormulario()
            setAba('nova')
          }}
        >
          Nova matéria
        </button>
        <button
          type="button"
          className={aba === 'anotacoes' ? 'aba ativa' : 'aba'}
          onClick={function () {
            setAba('anotacoes')
          }}
        >
          Anotações
        </button>
      </nav>

      {mensagemErro && <p className="mensagem-erro">{mensagemErro}</p>}

      {/* ABA 1: MINHAS MATÉRIAS */}
      {aba === 'materias' && (
        <section>
          <h1 className="titulo-pagina">Minhas matérias</h1>
          <p className="subtitulo-pagina">
            {totalConcluidas} de {totalMaterias} concluídas
          </p>

          <div className="barra-progresso-fundo">
            <div
              className="barra-progresso-preenchida"
              style={{ width: porcentagem + '%' }}
            ></div>
          </div>

          <div className="linha-filtros">
            <button
              type="button"
              className={filtro === 'todas' ? 'filtro ativo' : 'filtro'}
              onClick={function () {
                setFiltro('todas')
              }}
            >
              Todas ({totalMaterias})
            </button>
            <button
              type="button"
              className={filtro === 'pendentes' ? 'filtro ativo' : 'filtro'}
              onClick={function () {
                setFiltro('pendentes')
              }}
            >
              Pendentes ({totalPendentes})
            </button>
            <button
              type="button"
              className={filtro === 'concluidas' ? 'filtro ativo' : 'filtro'}
              onClick={function () {
                setFiltro('concluidas')
              }}
            >
              Concluídas ({totalConcluidas})
            </button>
          </div>

          <div className="lista-materias">
            {materiasFiltradas.length === 0 ? (
              <div className="caixa-vazia">Nenhuma matéria cadastrada ainda.</div>
            ) : (
              materiasFiltradas.map(function (materia) {
                return (
                  <div key={materia.id} className="cartao-materia">
                    <div className="lado-esquerdo">
                      <button
                        type="button"
                        className={materia.concluida ? 'circulo feito' : 'circulo'}
                        onClick={function () {
                          alternarConclusao(materia.id)
                        }}
                      >
                        {materia.concluida ? '✓' : ''}
                      </button>

                      <div>
                        <h2 className="nome-materia">{materia.nome}</h2>
                        <p className="conteudo-materia">{materia.conteudo}</p>
                        <div className="linha-agenda">
                          {(materia.dias || []).map(function (dia) {
                            return (
                              <span key={dia} className="pilula-dia">
                                {dia}
                              </span>
                            )
                          })}
                          {(materia.inicio || materia.fim) && (
                            <span className="texto-horario">
                              {materia.inicio} – {materia.fim}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="lado-direito">
                      <button
                        type="button"
                        className={materia.concluida ? 'selo-status feito' : 'selo-status'}
                        onClick={function () {
                          alternarConclusao(materia.id)
                        }}
                      >
                        {materia.concluida ? '✓ Concluída' : '○ Pendente'}
                      </button>

                      <button
                        type="button"
                        className="botao-borda"
                        onClick={function () {
                          iniciarEdicao(materia)
                        }}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="botao-borda"
                        onClick={function () {
                          abrirAnotacaoDaMateria(materia.id)
                        }}
                      >
                        Anotar
                      </button>

                      <button
                        type="button"
                        className="botao-borda"
                        onClick={function () {
                          excluirMateria(materia.id)
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      )}

      {/* ABA 2: NOVA MATÉRIA / EDITAR */}
      {aba === 'nova' && (
        <section>
          <h1 className="titulo-pagina">
            {editandoMateriaId !== null ? 'Editar matéria' : 'Nova matéria'}
          </h1>
          <p className="subtitulo-pagina">
            Defina o que, quando e por quanto tempo você vai estudar.
          </p>

          <form className="cartao-formulario" onSubmit={salvarNovaMateria}>
            <div className="campo">
              <label>Nome da matéria</label>
              <input
                type="text"
                placeholder="Digite o nome da matéria"
                value={nomeMateria}
                onChange={function (e) {
                  setNomeMateria(e.target.value)
                }}
                required
              />
            </div>

            <div className="campo">
              <label>Conteúdo</label>
              <textarea
                rows="4"
                placeholder="Digite o conteúdo a ser estudado"
                value={conteudo}
                onChange={function (e) {
                  setConteudo(e.target.value)
                }}
                required
              ></textarea>
            </div>

            <div className="duas-colunas">
              <div className="campo">
                <label>Início</label>
                <div className="caixa-hora">
                  <input
                    type="time"
                    value={inicio}
                    onChange={function (e) {
                      setInicio(e.target.value)
                    }}
                  />
                  <span className="rotulo-ampm">{mostrarAmPm(inicio)}</span>
                </div>
              </div>

              <div className="campo">
                <label>Fim</label>
                <div className="caixa-hora">
                  <input
                    type="time"
                    value={fim}
                    onChange={function (e) {
                      setFim(e.target.value)
                    }}
                  />
                  <span className="rotulo-ampm">{mostrarAmPm(fim)}</span>
                </div>
              </div>
            </div>

            <div className="campo">
              <label>Dias da semana</label>
              <div className="linha-dias">
                {diasDaSemana.map(function (dia) {
                  const marcado = diasEscolhidos.includes(dia)
                  return (
                    <button
                      key={dia}
                      type="button"
                      className={marcado ? 'botao-dia marcado' : 'botao-dia'}
                      onClick={function () {
                        clicarDia(dia)
                      }}
                    >
                      {dia}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <button type="submit" className="botao-roxo botao-salvar">
                {editandoMateriaId !== null ? 'Salvar alterações' : 'Salvar matéria'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ABA 3: ANOTAÇÕES */}
      {aba === 'anotacoes' && (
        <section>
          <h1 className="titulo-pagina">Anotações</h1>
          <p className="subtitulo-pagina">
            Escolha a matéria e escreva. Tudo é salvo sozinho.
          </p>

          {!materiaAtual ? (
            <div className="caixa-vazia">Cadastre uma matéria para anotar.</div>
          ) : (
            <div className="grade-anotacoes">
              <div className="menu-materias">
                {materias.map(function (materia) {
                  const selecionada = materia.id === materiaAtual.id
                  return (
                    <button
                      key={materia.id}
                      type="button"
                      className={selecionada ? 'item-materia-menu ativo' : 'item-materia-menu'}
                      onClick={function () {
                        setMateriaSelecionadaId(materia.id)
                      }}
                    >
                      {materia.nome}
                    </button>
                  )
                })}
              </div>

              <div className="cartao-anotacao">
                <div className="topo-anotacao">
                  <h2 className="titulo-anotacao">
                    {materiaAtual.nome} · {materiaAtual.conteudo}
                  </h2>
                  <button
                    type="button"
                    className="botao-borda"
                    onClick={function () {
                      alternarConclusao(materiaAtual.id)
                    }}
                  >
                    {materiaAtual.concluida ? '✓ Concluída' : '○ Marcar como concluída'}
                  </button>
                </div>

                <div className="campo">
                  <label>Anotação</label>
                  <textarea
                    className="area-texto-anotacao"
                    value={materiaAtual.anotacao}
                    onChange={function (e) {
                      mudarAnotacao(e.target.value)
                    }}
                    placeholder="Escreva suas anotações..."
                  ></textarea>
                </div>

                <span className="texto-salvo">Salvo às {materiaAtual.salvoEm}</span>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default App