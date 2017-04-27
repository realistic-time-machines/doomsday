const crypto = require('crypto')
const fs = require('fs')
const escape = require('lodash.escape')
const Koa = require('koa')
const body_parser = require('koa-bodyparser')
const app = new Koa()


const docs = {}

const template = (text, data) => Object.keys(data).reduce((t, k) => t.split(`{${k}}`).join(data[k]), text)

const layout = fs.readFileSync('layout.html').toString()

const raw_homepage = template(layout, { content: fs.readFileSync('index.html').toString() })
const raw_showpage = template(layout, { content: fs.readFileSync('show.html').toString() })
const new_form = template(layout, { content: fs.readFileSync('new.html').toString() })


let templated_homepage = template(raw_homepage, { links: [] })


const request_handlers = {
  '/': async (ctx) => {
    ctx.type = 'html'
    ctx.body = templated_homepage
  },
  '/new': async (ctx) => {
    ctx.type = 'html'
    ctx.body = new_form
  },
  '/create': async (ctx) => {
    const { dob, content } = ctx.request.body
    const created = Date.now() / 1000
    const key = crypto.createHash('md5').update(dob + content + created).digest('hex')

    docs[key] = { content, dob, created }

    request_handlers['/' + key] = async (ctx) => {
      ctx.body = template(raw_showpage, {
        created: new Date(created * 1000).toString(),
        release: new Date(dob * 1000).toString(),
        content: Date.now() / 1000 > dob ? escape(content).replace(/\n/g, '<br />') : '[not released]'
      })
    }

    const links = Object.keys(docs).map(k => `<li><a href="/${k}">${k}</a></li>`).join('')
    templated_homepage = template(raw_homepage, { links })

    ctx.redirect('/' + key)
  }
}

app.use(body_parser())

app.use(async (ctx) => {
  if (!request_handlers.hasOwnProperty(ctx.request.path)) {
    ctx.status = 404
    ctx.body = 'you are lost'
    return
  }

  await request_handlers[ctx.request.path](ctx)
})

app.listen(3000)
