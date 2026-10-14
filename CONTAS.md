# Contas de acesso · StockControl

Banco: projeto Supabase **StockControl** (`gvcerdwheqpcmdcfsowu`, região São Paulo).
O arquivo `.env.local` deste projeto já aponta para ele.

| Perfil | E-mail | Senha | O que pode fazer |
| --- | --- | --- | --- |
| Administrador | caiofigueiramachado.senai@gmail.com | a senha que você cadastrou | Tudo: cadastrar, editar e excluir produtos, registrar entradas e saídas, comentar |
| Usuário comum | usuario@stockcontrol.com | Usuario@123 | Consultar produtos, painel, categorias e histórico; ver e cadastrar comentários |

Para promover outra conta a administrador, rode no SQL Editor do Supabase:

```sql
update public.usuarios set role = 'admin'
where id = (select id from auth.users where email = 'email@exemplo.com');
```

> Troque a senha da conta de usuário comum se o projeto for publicado ou compartilhado.
