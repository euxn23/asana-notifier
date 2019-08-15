import { Client, resources } from 'asana'
import * as dayjs from 'dayjs'

const main = async () => {
  const accessToken = process.env.ASANA_ACCESS_TOKEN

  if (!accessToken) throw new Error()

  const client = Client.create().useAccessToken(accessToken)

  const workspaces = await client.users.me().then(me => me.workspaces)

  const workspaceId = 735675183712368
  const userTasksId = '760472273951920'

  const userId = await client.users.me().then(me => me.id)
  // const tasks = await client.tasks.findAll()
  // console.log(await client.projects.findAll())

  let latestNotifiedAt = dayjs()

  const fetchAndNotify = async () => {
    const tasks = await client.tasks.findAll({
      assignee: userId,
      workspace: workspaceId
    })
    const mentions = await tasks.data.reduce(async (mentionsPromise, task) => {
      const stories = await client.stories.findByTask(task.id)
      const mentions = stories.data
        .filter(story => story.text.match(userTasksId))
        .map(story => ({
          task,
          story
        }))
      return [...(await mentionsPromise), ...mentions]
    }, Promise.resolve(<{ task: resources.Tasks.Type; story: resources.Stories.Type }[]>[]))

    const sortedMentions = mentions.sort(
      (prev, next) =>
        dayjs(next.story.created_at).unix() -
        dayjs(prev.story.created_at).unix()
    )

    const newMentions = sortedMentions.filter(({ story, task }) =>
      dayjs(story.created_at).isAfter(latestNotifiedAt)
    )

    if (sortedMentions.length)
      latestNotifiedAt = dayjs(sortedMentions[0].story.created_at)

    console.log(newMentions)
  }

  setInterval(async () => {
    fetchAndNotify().catch(console.error)
  }, 10 * 1000)
}

main().catch(console.error)
