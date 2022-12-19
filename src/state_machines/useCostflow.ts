import TelegramBot, { Message } from 'node-telegram-bot-api'
import costflow from 'costflow'
import { createMachine, interpret, assign } from 'xstate'
import { Posting, putEntries, Transaction } from '../fava'
import { CANCEL_KEYBOARD, DEFAULT_KEYBOARD } from '../markup'
import { formatDate, escape } from '../utils'
//import askFormula from './askFormula'
import askConfirm from './askConfirm'

const config = {
  mode: "beancount",
  currency: "HKD",
  timezone: "Asia/Hong_Kong",
  account: {
    cash: "Assets:Cash:HKD",
    pt: "Expenses:Transport:Public",
  },
  formula: {
    bus: "@Bus 15.80 cash > pt",
  },
};

type Context = {
  id: number
  client: TelegramBot
  formula?: string
  postings: Posting[]
  //payee?: string
  //narration?: string
  final?: Transaction
}

type Event = { type: 'ANSWER', msg: Message }

const machine = createMachine<Context, Event>({
  id: 'newTransaction',
  initial: 'formula',
  predictableActionArguments: true,
  states: {
	formula: {
		entry: ({ client, id }) => client.sendMessage(id, '🗒 Formula', CANCEL_KEYBOARD),
		on: {
			ANSWER: {
				actions: assign({ formula: (ctx, { msg: { text } }) => text }),
			target: 'confirm'
			}
		}
    },
  /*
    narration: {
      invoke: {
        id: 'askNarration',
        src: askNarration,
        autoForward: true,
        data: (ctx) => ({ id: ctx.id, client: ctx.client, askPayee: true, askNarration: true }),
        onDone: {
          actions: assign({
            narration: (ctx, { data }) => data.narration,
            payee: (ctx, { data }) => data.payee
          }),
          target: 'account'
        }
      }
    },
    account: {
      invoke: {
        id: 'askAccount',
        src: askAccount,
        autoForward: true,
        data: (ctx) => ({ id: ctx.id, client: ctx.client, doneAllowed: ctx.postings.length >= 2 }),
        onDone: [
          {
            cond: (ctx, { data }) => data === undefined,
            target: 'confirm'
          },
          {
            actions: assign({ currentAccount: (ctx, { data }) => data }),
            target: 'amount'
          }
        ]
      }
    },
    amount: {
      invoke: {
        id: 'askAmount',
        src: askAmount,
        autoForward: true,
        data: (ctx) => ({ id: ctx.id, client: ctx.client }),
        onDone: {
          actions: assign<Context, DoneInvokeEvent<any>>({
            postings: (ctx, { data }) => [...ctx.postings, { account: ctx.currentAccount, amount: data } as Posting],
            currentAccount: () => undefined
          }),
          target: 'account'
        }
      }
    },
	*/
    confirm: {
      entry: assign<Context, Event>({
        final: ctx => ({
          type: 'Transaction',
          date: formatDate(new Date()),
          flag: '*',
          narration: '',
          payee: '',
          postings: [],
          meta: {},
          tags: ['costflow'],
          links: []
        } as Transaction)
      }),
      invoke: {
        id: 'askConfirm',
        src: askConfirm,
        autoForward: true,
        data: (ctx) => ({ id: ctx.id, client: ctx.client, question: confirmTransaction(ctx.final!) }),
        onDone: {
          actions: async ({ client, id, final }) => {
            try {
              await putEntries([final!])
              await client.sendMessage(id, '✅ All done!', DEFAULT_KEYBOARD)
			  await client.deleteMessage(id, msg.message_id)
            } catch (err) {
              await client.sendMessage(id, '❗️ Unexpected error', DEFAULT_KEYBOARD)
            }
          },
          target: 'done'
        }
      }
    },
    done: {
      type: 'final'
    }
  }
})

export default (msg: Message, client: TelegramBot) => {
  const context = {
    id: msg.chat!.id,
    client,
    postings: []
  }

  const service = interpret<Context, any, Event, any, any>(machine.withContext(context))

  service.start()
  return service
}

/*
export function confirmTransaction ({ payee, narration, postings }: Transaction) {
  let r = `🧾 ${payee ? `*${escape(payee!)}* ${escape(narration)}` : `*${escape(narration)}*`}\n\n`
  r += postings
    .map(({ account, amount }) => `_${escape(account)}_\`\t${escape(amount)}\``)
    .join('\n')
  r += '\n*Confirm?*'

  return r
}
*/
export function confirmTransaction ({ postings }: Transaction) {
  let r = '\n*Confirm?*'

  return r
}

