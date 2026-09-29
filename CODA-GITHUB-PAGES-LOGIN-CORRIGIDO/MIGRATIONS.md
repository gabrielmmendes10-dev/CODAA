# Migrações do banco SQLite

Este documento descreve o estado atual das migrações do Coda Educacional 10.5. O banco usa `node:sqlite` nativo e o bootstrap fica em `db.mjs`. Ainda não existe uma tabela de controle de versão numérica; portanto, alterações futuras devem seguir a convenção abaixo até que um mecanismo formal seja introduzido.

## Histórico implementado

| Etapa | Implementação | Comportamento esperado |
| --- | --- | --- |
| Schema inicial | `initDatabase()` cria com `CREATE TABLE IF NOT EXISTS` as entidades de autenticação, perfis, sessões, turmas, matrículas, avisos, mensagens, notificações, workspaces, eventos, avaliações, entregas, frequência, notas, rubricas, conteúdo, materiais e desafios. | Bancos novos recebem o schema completo sem comandos manuais. |
| Migração de papéis administrativos | `migrateUsersForAdminRole()` inspeciona o SQL da tabela `users`. Quando a restrição antiga não contém `Admin`, cria `users_v10`, copia os registros com `INSERT ... SELECT`, remove a tabela antiga e renomeia `users_v10` para `users` dentro de uma transação. | Bancos legados passam a aceitar `Aluno`, `Professor` e `Admin` preservando IDs e credenciais existentes. |
| Isolamento institucional | `addColumn()` adiciona `institution_id` a `users` e `classes` quando as colunas ainda não existem. | Bancos anteriores recebem o vínculo padrão com a instituição `1`, sem recriação destrutiva das tabelas. |
| Governança e histórico | O bootstrap cria `institutions`, `institution_settings`, `privacy_tasks`, `audit_logs`, `backup_history` e `lesson_content_versions`, além dos índices correspondentes. | Recursos institucionais, auditoria, backups e versões de conteúdo ficam disponíveis em instalações novas e antigas. |
| Seeds idempotentes | `INSERT OR IGNORE` cria a instituição padrão, cinco tarefas de privacidade e contas internas conforme as variáveis de ambiente configuradas. | Reiniciar o servidor não duplica seeds nem sessões expiradas. |

## Convenção para novas migrações

Cada mudança estrutural que não puder ser expressa de modo idempotente por `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` ou uma checagem de coluna deve receber uma etapa nomeada e versionada. O nome da tabela temporária ou de transição deve seguir o formato `<tabela>_vNN`, em que `NN` é o próximo número de versão do schema. A tabela temporária deve manter as chaves primárias e os dados necessários, ser preenchida a partir da versão anterior com `INSERT ... SELECT`, e somente então substituir a tabela antiga dentro de uma transação `BEGIN IMMEDIATE`/`COMMIT`, com `ROLLBACK` em caso de erro.

Uma nova versão deve ser criada quando houver alteração de coluna, restrição, relacionamento, normalização de dados ou qualquer mudança que não seja automaticamente segura em uma instalação já existente. Antes de alterar o bootstrap, deve-se criar um backup SQLite, testar um banco novo, testar um banco representativo da versão anterior e verificar que as operações de leitura e escrita continuam usando prepared statements.

A partir da próxima migração, registre a etapa neste arquivo com o número, o motivo, as tabelas afetadas, a estratégia de população e a forma de rollback. Para uma tabela `users`, por exemplo, a sequência esperada é `users_v11` → copiar e validar os dados de `users` → substituir a tabela em transação → registrar a alteração neste histórico. Não reutilize um sufixo de versão e não faça `DROP TABLE` fora de uma transação de migração.

## Checklist operacional

Antes de publicar uma alteração de schema, execute `npm run check` e `npm test`, valide restauração a partir de um arquivo em `data/backups` e confirme que o novo bootstrap é idempotente ao ser executado duas vezes. O arquivo `data/coda.sqlite` e a pasta `data/backups` são dados locais; eles não devem ser versionados nem incluídos no ZIP de distribuição.
