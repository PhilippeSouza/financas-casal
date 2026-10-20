# 💑 Finanças Casal

Aplicação web para o casal acompanhar as finanças do mês: contas fixas, gastos variáveis, mercado e entradas, com dados sincronizados na nuvem entre os dois celulares.

## Funcionalidades
- Login por e-mail (Firebase Authentication)
- Lançamentos de gastos variáveis, mercado e entradas, por mês
- Contas fixas (aluguel e internet)
- Cada lançamento guarda quem o fez (pela conta logada)
- Sincronização em tempo real pelo Firestore; a gravação é por transação, então lançamentos simultâneos não se apagam

## Tecnologias
HTML, CSS e JavaScript puro · Firebase Authentication e Firestore

## Segurança dos dados
A chave do Firebase no código é pública por design. Quem protege os dados são as **regras do Firestore** em [`firestore.rules`](firestore.rules), que liberam leitura e escrita só para as duas contas do casal. O arquivo traz os marcadores `UID_PESSOA_1` e `UID_PESSOA_2`: troque pelos UIDs reais (Firebase Console > Authentication > Usuários) antes de publicar as regras.

## Como executar
Abra pelo GitHub Pages ou sirva a pasta com um servidor estático:

```bash
npx serve .
```

## Limitações conhecidas
- Os valores das contas fixas (aluguel e internet) estão no código e não têm tela de edição.
- "Resetar mês" apaga o mês para os dois usuários.
- Sem testes automatizados ainda.

Desenvolvido por [Philippe Souza](https://github.com/PhilippeSouza) com apoio de IA; o meu papel é especificar, validar e testar.
