
# Foco — Organizador de Estudos Full-Stack

Aplicação web full-stack para planejamento e acompanhamento de estudos, permitindo cadastrar usuários, organizar matérias com horários e dias da semana, acompanhar métricas de conclusão em tempo real e manter anotações persistidas em um banco de dados relacional.

---

## Sumário

- [Visão Geral e Funcionalidades](#visão-geral-e-funcionalidades)
- [Arquitetura e Tecnologias](#arquitetura-e-tecnologias)
- [Banco de Dados e Script SQL](#banco-de-dados-e-script-sql)
- [Modelagem do Banco de Dados](#modelagem-do-banco-de-dados)
- [Documentação da API REST](#documentação-da-api-rest)
- [Pré-requisitos](#pré-requisitos)
- [Configuração de Ambiente e Segurança](#configuração-de-ambiente-e-segurança)
- [Estrutura de Diretórios](#estrutura-de-diretórios)
- [Como Executar o Projeto](#como-executar-o-projeto)
- [Versionamento Seguro no GitHub](#versionamento-seguro-no-github)
- [Boas Práticas Aplicadas](#boas-práticas-aplicadas)

---

## Visão Geral e Funcionalidades

O Foco foi desenvolvido para facilitar a organização da rotina de estudos, reunindo ferramentas de planejamento, acompanhamento e registro de informações em uma única aplicação.

### Principais funcionalidades

- **Autenticação de Usuários:** fluxo de cadastro (`Criar conta`) e autenticação (`Entrar`), vinculando as matérias e anotações ao identificador único do usuário.
- **Gestão de Matérias (CRUD):** criação, leitura, edição e exclusão de matérias, contendo título, conteúdo programático, horário de início e término e dias da semana (`Seg` a `Dom`).
- **Acompanhamento de Progresso:** cálculo dinâmico do percentual de conclusão, barra de progresso visual e filtros por status (`Todas`, `Pendentes` e `Concluídas`).
- **Bloco de Anotações por Matéria:** editor dedicado por disciplina, com registro automático do horário da última atualização (`HH:MM`) e persistência no banco de dados.
- **Integridade Referencial:** exclusão em cascata (`ON DELETE CASCADE`), garantindo que a remoção de uma matéria também exclua seus dias agendados e suas anotações.

---

## Arquitetura e Tecnologias

O projeto está dividido em duas partes principais: front-end e back-end, que se comunicam por meio de uma API REST.

### Front-end

- **React (`src/App.jsx`):** componente principal responsável pelos estados da interface, formulários de login e cadastro, gerenciamento de matérias, filtros, editor de anotações e requisições `fetch` para o back-end.
- **CSS (`src/App.css`):** responsável pela estilização dos componentes, cartões, botões, abas, barra de progresso e layout responsivo.
- **HTML (`index.html`):** estrutura base na qual a aplicação React é montada no navegador.

### Back-end

- **Express (`backend/server.js`):** servidor responsável pelas rotas da API REST, autenticação, operações com matérias, normalização de horários e transações SQL.
- **MySQL (`backend/db.js`):** configuração do pool de conexões com o banco de dados.
- **Dotenv:** gerenciamento das variáveis de ambiente utilizadas na conexão com o banco.

### Arquivos de configuração

- `backend/.env.example`: modelo das variáveis de ambiente necessárias para executar o back-end.
- `backend/.env`: arquivo local com as credenciais reais do banco de dados. Não deve ser enviado ao GitHub.
- `.gitignore`: define os arquivos e diretórios que devem ser ignorados pelo Git, como `node_modules/`, arquivos `.env` e builds.

---

## Banco de Dados e Script SQL

O banco de dados **`foco`** foi estruturado em quatro tabelas relacionais, responsáveis por organizar as informações dos usuários, matérias, dias agendados e anotações.

### Tabelas do banco de dados

| Tabela | Descrição |
|---|---|
| `usuarios` | Armazena os dados dos usuários. |
| `materias` | Registra as matérias vinculadas a cada usuário. |
| `materia_dias` | Armazena os dias da semana selecionados para cada matéria. |
| `anotacoes` | Guarda o conteúdo das anotações e seus horários de atualização. |

### Estrutura das tabelas

**1. `usuarios`**

Armazena os dados de identificação e acesso dos usuários.

Campos:
- `id`
- `nome`
- `email`
- `senha`
- `data_cadastro`

O campo `email` possui restrição de unicidade para evitar cadastros duplicados.

**2. `materias`**

Armazena as matérias cadastradas e vinculadas ao usuário responsável.

Campos:
- `id`
- `usuario_id`
- `nome`
- `conteudo`
- `hora_inicio`
- `hora_fim`
- `concluida`
- `data_cadastro`

**3. `materia_dias`**

Registra os dias da semana selecionados para cada matéria.

Campos:
- `id`
- `materia_id`
- `dia_semana`

Os dias aceitos são: `Seg`, `Ter`, `Qua`, `Qui`, `Sex`, `Sáb` e `Dom`.

Existe uma restrição de unicidade para impedir que o mesmo dia seja cadastrado mais de uma vez para uma matéria.

**4. `anotacoes`**

Armazena o conteúdo das anotações relacionadas a cada matéria.

Campos:
- `id`
- `materia_id`
- `texto`
- `horario_salvo`
- `data_atualizacao`

### Script SQL de criação

O script SQL é responsável pela criação e configuração da estrutura do banco de dados.

Ele contém quatro etapas principais:

1. **Criação do banco:** cria o schema `foco`, caso ainda não exista, utilizando a codificação `utf8mb4` para suportar acentos e caracteres especiais.
2. **Criação da tabela `usuarios`:** define a chave primária `id`, os campos de identificação e a restrição de e-mail único.
3. **Criação da tabela `materias`:** estabelece a estrutura das matérias e a chave estrangeira `usuario_id`, vinculando cada registro ao respectivo usuário.
4. **Criação das tabelas dependentes:** cria `materia_dias` e `anotacoes`, vinculadas a `materias.id`, utilizando `ON DELETE CASCADE` para manter a integridade referencial.

---

## Modelagem do Banco de Dados

O relacionamento entre as tabelas foi definido para manter a organização e a integridade das informações.

- Um usuário pode possuir várias matérias.
- Uma matéria pode possuir vários dias agendados.
- Uma matéria pode possuir uma anotação associada.

As relações utilizam chaves estrangeiras (`FOREIGN KEY`) e regras de exclusão em cascata (`ON DELETE CASCADE`).

---

## Documentação da API REST

O back-end utiliza o Express para disponibilizar as rotas responsáveis pela comunicação entre o front-end e o banco de dados.

### Principais rotas

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/health` | Verifica o funcionamento do servidor. |
| POST | `/usuarios` | Realiza o cadastro de usuários. |
| POST | `/login` | Autentica o usuário. |
| GET/POST | `/materias` | Consulta e cadastra matérias. |
| PUT/DELETE | `/materias/:id` | Atualiza ou exclui uma matéria. |
| PATCH | `/materias/:id/conclusao` | Atualiza o status de conclusão. |
| GET/PUT | `/materias/:id/anotacao` | Consulta e atualiza as anotações. |

**Observação:** os métodos apresentados devem corresponder aos métodos efetivamente implementados no arquivo `backend/server.js`.

---

## Pré-requisitos

Para desenvolver e executar a aplicação localmente, é necessário ter instalado:

- **Node.js:** versão 18 ou superior.
- **MySQL Server:** para criação e gerenciamento do banco de dados.
- **MySQL Workbench (opcional):** ferramenta gráfica para consultar e administrar o banco.
- **Git:** para versionamento do código e integração com o GitHub.

---

## Configuração de Ambiente e Segurança

O arquivo `.env` armazena informações sensíveis do ambiente local, como usuário e senha do banco de dados.

**Esse arquivo nunca deve ser enviado ao GitHub.**

### Como criar e configurar o `.env`

1. Verifique se os arquivos `.env` estão listados no `.gitignore`.
2. Acesse a pasta `backend/`.
3. Copie o arquivo `.env.example`.
4. Renomeie a cópia para `.env`.
5. Preencha as variáveis com os dados da sua instalação local do MySQL.

### Exemplo de configuração

```env
PORT=3001
DB_HOST=localhost
DB_USER=seu_usuario_mysql
DB_PASSWORD=sua_senha_mysql
DB_NAME=foco
```

**Importante:** substitua os valores de exemplo pelas credenciais do seu ambiente local. Não compartilhe suas senhas ou credenciais reais.

---

## Estrutura de Diretórios

```text
organizador_estudos/
│
├── backend/
│   ├── db.js
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── .env
│
├── src/
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
│
├── .gitignore
├── package.json
└── README.md
```

### Descrição dos principais arquivos

| Arquivo | Responsabilidade |
|---|---|
| `backend/db.js` | Configuração do pool de conexões MySQL. |
| `backend/server.js` | Rotas da API REST e comunicação com o banco. |
| `backend/package.json` | Dependências e scripts do servidor. |
| `backend/.env.example` | Modelo das variáveis de ambiente. |
| `src/App.jsx` | Componente principal da aplicação React. |
| `src/App.css` | Estilização da interface. |
| `src/main.jsx` | Ponto de entrada da aplicação React. |
| `.gitignore` | Define os arquivos ignorados pelo Git. |
| `package.json` | Dependências e scripts do front-end. |

---

## Como Executar o Projeto

### 1. Clone o repositório

```bash
git clone URL_DO_REPOSITORIO
```

### 2. Acesse a pasta do projeto

```bash
cd organizador_estudos
```

### 3. Instale as dependências do front-end

```bash
npm install
```

### 4. Configure o banco de dados

- Inicie o MySQL Server.
- Crie o banco de dados `foco` executando o script SQL de criação.
- Configure o arquivo `backend/.env` com as credenciais locais.

### 5. Instale as dependências do back-end

```bash
cd backend
npm install
```

### 6. Inicie o servidor back-end

```bash
npm start
```

O servidor estará disponível em:

```text
http://localhost:3001
```

### 7. Inicie o front-end

Abra outro terminal, retorne à pasta principal do projeto e execute:

```bash
npm run dev
```

O endereço de acesso será exibido pelo Vite no terminal.

---

## Versionamento Seguro no GitHub

Para manter o projeto organizado e proteger informações sensíveis, algumas práticas devem ser adotadas durante o versionamento.

### Arquivos que não devem ser enviados

- `node_modules/`
- `.env`
- `backend/.env`
- Arquivos de configuração com credenciais reais.
- Pastas de build geradas automaticamente, quando não necessárias ao repositório.

### Exemplo de `.gitignore`

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
backend/.env
```

**Atenção:** verifique se o `.env.example` contém apenas valores ilustrativos e nunca credenciais reais.

---

## Boas Práticas Aplicadas

O desenvolvimento do Foco considera práticas importantes para organização e manutenção de aplicações web:

- **Separação de responsabilidades:** divisão entre front-end, back-end e banco de dados.
- **Organização de código:** estruturação dos arquivos conforme suas funções.
- **Integridade referencial:** utilização de chaves primárias e estrangeiras.
- **Persistência de dados:** armazenamento das informações em banco de dados relacional.
- **Variáveis de ambiente:** proteção das credenciais de acesso ao banco.
- **Versionamento:** utilização do Git e GitHub para controle das alterações.
- **API REST:** comunicação entre as camadas da aplicação por meio de requisições HTTP.

---
