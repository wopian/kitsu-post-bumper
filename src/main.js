import OAuth2 from 'client-oauth2'
import JsonApi from 'devour-client'
import Ora from 'ora'
import { version } from '../package'
import { env } from './env'

const posts = [8716591, 8716592]

const baseUrl = 'https://kitsu.io/api'
const auth = new OAuth2({
  clientId: env.CLIENT_ID,
  clientSecret: env.CLIENT_SECRET,
  accessTokenUri: `${baseUrl}/oauth/token`
})
const Kitsu = new JsonApi({
  apiUrl: `${baseUrl}/edge`,
  logger: true
})

Kitsu.headers['User-Agent'] = `PostBumper/${version} (wopian)`

Kitsu.define('user', {
  name: ''
})

Kitsu.define('post', {
})

Kitsu.define('comment', {
  content: '',
  createdAt: '',
  user: {
    jsonApi: 'hasOne',
    type: 'users'
  },
  post: {
    jsonApi: 'hasOne',
    type: 'posts'
  }
})

const main = async () => {
  const ora = await Ora({ color: 'yellow', text: 'Authorising' }).start()

  let { accessToken } = await auth.owner.getToken(env.USERNAME, env.PASSWORD)

  Kitsu.headers['Authorization'] = `Bearer ${accessToken}`

  for (let post of await posts) {
    ora.text = await 'Getting comments'

    let response = await Kitsu.findAll('comment', {
      filter: { post_id: post },
      fields: { comments: 'content,createdAt,user,post', users: 'id,name', posts: 'id' },
      include: 'post,user',
      sort: '-updated_at',
      page: { limit: 20 }
    })

    for (let test of await response) {
      if (test.content === env.CONTENT && test.user.name === env.USERNAME) {
        ora.text = await 'Deleting comment'

        await Kitsu.destroy('comment', test.id)
        .catch(err => console.error(err))

        ora.text = await 'Posting comment'

        await Kitsu.create('comment', {
          content: env.CONTENT,
          user: { id: test.user.id },
          post: { id: await post }
        })
        .catch(err => console.error(err))
        ora.text = await 'Done'

        // Log actions
        await ora.stop()
        await console.log(`\nComment: ${test.id}`)
        await console.log(`Content: ${test.content}`)
        await console.log(`User: ${test.user.name}`)
        await console.log(`Post: ${test.post.id}`)
        await ora.start()
      }
    }

    // await console.log(await response)
  }

  await ora.stop()
}

(() => {
  main()
  setInterval(async () => {
    await main()
  }, 1800000)
})()
