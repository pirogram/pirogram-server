const Koa = require('koa')
const router = require( 'koa-route')
const models = require('../models')
const cms = require('../lib/cms')
const {ensureSuperuser} = require('../lib/util')
const flash = require('../lib/flash')
const validator = require('validator');
const _ = require('lodash')

const booksApp = new Koa();

booksApp.use( router.get( '/books', async function( ctx) {
    if( !ensureSuperuser( ctx)) {
        flash.addFlashMessage( ctx.session, "warning", "You must be a superuser on this site for writing a book.")
        ctx.redirect('/login')
        return
    }

    const booksList = cms.allBooks().map( (book, i) => {
        return { title: book.title, code: book.code, lastUpdated: book.lastUpdated}
    })

    await ctx.render( 'books', {booksList})
}))

booksApp.use( router.get( '/books/create', async function( ctx) {
    if( !ensureSuperuser( ctx)) {
        flash.addFlashMessage( ctx.session, "warning", "You must be a superuser on this site for writing a book.")
        ctx.redirect('/login')
        return
    }

    await ctx.render( 'create-book')
}))

booksApp.use( router.post( '/books/create', async function( ctx) {
    if( !ensureSuperuser( ctx)) {
        flash.addFlashMessage( ctx.session, "warning", "You must be a superuser on this site for writing a book.")
        ctx.redirect('/login')
        return
    }

    const errors = {};
    const title = ctx.request.body.title || '';
    let code = ctx.request.body.code || '';
    code = code.toLowerCase()

    if( !validator.isLength( title, {min: 5, max: 512})) {
        errors['title'] = 'Title must be 5 to 512 characters.';
    }

    if( !validator.isLength( code, {min: 5, max: 256}) ||
        !validator.matches( code, /^([a-zA-Z0-9-]+)$/)) {
        errors['code'] = 'Code must be 5 to 256 characters. Alphanumeric and - allowed.';
    }

    if( cms.getBookByCode( code)) {
        errors['code'] = `There is already a book by the code ${code}`;
    }

    if( _.keys(errors).length > 0) {
        await ctx.render('create-book', {errors, title, code});
        return;
    }

    await cms.createBook(code, title)
    ctx.redirect(`/editor/${code}`)
}))

module.exports = {booksApp}