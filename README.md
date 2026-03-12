# multi-git-clone (mgc)

同じリポジトリを複数フォルダに並列クローンするCLIツール。

Claude CodeなどのAIコーディングアシスタントで並列ワークスペースを作りたいとき、ワンコマンドで複数クローンを作成できます。

## Install

```bash
npm install -g multi-git-clone
```

Or use directly with npx:

```bash
npx multi-git-clone vercel/next.js 3
```

## Usage

```bash
mgc <repo> [count]
```

### Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `<repo>` | GitHub repository (`org/repo`, URL, or SSH) | required |
| `[count]` | Number of clones (1-10) | 1 |

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--base <path>` | Base directory for clones | `~/git/github.com` |
| `--sep <char>` | Numbering separator (`-`, `_`, `.`) | `-` |
| `--flat` | Skip org subdirectory | `false` |
| `--dry-run` | Preview clone paths without executing | `false` |
| `-h, --help` | Show help | |
| `-v, --version` | Show version | |

## Examples

```bash
# Clone once
mgc vercel/next.js

# Clone 3 copies in parallel
mgc vercel/next.js 3
# → ~/git/github.com/vercel/next.js
# → ~/git/github.com/vercel/next.js-2
# → ~/git/github.com/vercel/next.js-3

# Without org directory
mgc vercel/next.js 3 --flat
# → ~/git/github.com/next.js
# → ~/git/github.com/next.js-2
# → ~/git/github.com/next.js-3

# Custom separator
mgc vercel/next.js 3 --sep _
# → ~/git/github.com/vercel/next.js
# → ~/git/github.com/vercel/next.js_2
# → ~/git/github.com/vercel/next.js_3

# Custom base path
mgc vercel/next.js 3 --base ~/projects

# Preview only
mgc vercel/next.js 3 --dry-run
```

### Smart numbering

既存のディレクトリを検出して、次の番号から自動採番します。

```bash
# ~/git/github.com/vercel/next.js と next.js-2 が既に存在する場合:
mgc vercel/next.js 3
# → ~/git/github.com/vercel/next.js-3
# → ~/git/github.com/vercel/next.js-4
# → ~/git/github.com/vercel/next.js-5
```

## Config

`~/.mgcrc` にJSON形式でデフォルト値を設定できます:

```json
{
  "basePath": "~/git/github.com",
  "useOrgDirectory": true,
  "separator": "-"
}
```

CLI引数はconfig fileの値を上書きします。

## Use Cases

- **並列開発**: 複数のfeature branchを別ディレクトリで同時に作業
- **AI支援コーディング**: Claude Codeの並列セッション用に独立したワークスペースを作成
- **コードレビュー**: 複数PRを別ディレクトリで並行レビュー
- **テスト**: 異なる設定で同じリポジトリを複数セットアップ

## License

MIT
