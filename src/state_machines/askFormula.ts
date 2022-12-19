import TelegramBot, { Message } from 'node-telegram-bot-api'
import { ConditionPredicate, createMachine, assign } from 'xstate'
import { CANCEL_KEYBOARD } from '../markup'
import { isAmount, parseAmount } from '../utils'

//const util = require('util') // test

type Context = {
  id: number
  client: TelegramBot
  question?: string
  final?: string
}

type Event = { type: 'ANSWER', f: Message }

/*
const guards: Record<string, ConditionPredicate<Context, Event>> = {
  isValidAmount: (ctx, { msg }) => isAmount(msg),
  isInvalidAmount: (ctx, { msg }) => !isAmount(msg)
}
*/

export default createMachine<Context, Event>({
  id: 'askFormula',
  initial: 'formula',
  predictableActionArguments: true,
  states: {
    formula: {
      entry: ({ client, id, question }) => {
        const f = question || 'Costflow Formula please'
        client.sendMessage(id, f, CANCEL_KEYBOARD)
      },
      on: {
        ANSWER: {
			actions: assign<Context, Event>({ final: (ctx, { f }) => f }),
            target: 'done'
		/*
          {
            cond: 'isValidAmount',
            actions: assign<Context, Event>({ final: (ctx, { msg }) => parseAmount(msg) }),
            target: 'done'
          },
          {
            cond: 'isInvalidAmount',
            actions: ({ client, id }) => client.sendMessage(id, '❗️ Expected a valid amount', CANCEL_KEYBOARD),
            target: 'amount'
          }
		*/
        }
      }
    },
    done: {
      type: 'final',
      data: ctx => ctx.final
    }
  }
})/*.withConfig({
  guards
})*/
