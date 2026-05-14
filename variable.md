# Variables Reference

Use variables inside plugin text fields with curly braces, like `{user}`, `{server}`, `{botName}`, or `{steam_name}`.

Example:

```text
Hello {mention}, welcome to {server}! You are member #{member_count}.
```

## Sender And Target

| Variable | Details | Example |
| --- | --- | --- |
| `{user}` | Sender username. | Akashsuu |
| `{username}` | Sender username alias. | Akashsuu |
| `{tag}` | Sender Discord tag. | Akashsuu#0000 |
| `{user_tag}` | Sender Discord tag alias. | Akashsuu#0000 |
| `{id}` | Sender Discord user ID. | 123456789012345678 |
| `{user_id}` | Sender Discord user ID alias. | 123456789012345678 |
| `{userId}` | Sender Discord user ID alias. | 123456789012345678 |
| `{mention}` | Sender mention. | @Akashsuu |
| `{target}` | Target user tag. | OwO#8456 |
| `{targetTag}` | Target user tag alias. | OwO#8456 |
| `{targetName}` | Target username. | OwO |
| `{target_name}` | Target username alias. | OwO |
| `{targetId}` | Target user ID. | 987654321098765432 |
| `{target_id}` | Target user ID alias. | 987654321098765432 |
| `{targetMention}` | Target user mention. | @OwO |
| `{target_mention}` | Target user mention alias. | @OwO |
| `{afkMention}` | AFK user's mention. | @OwO |
| `{member}` | Member name. | Akashsuu |
| `{memberMention}` | Member mention. | @Akashsuu |

## Command, Server, And Channel

| Variable | Details | Example |
| --- | --- | --- |
| `{prefix}` | Current command prefix. | ! |
| `{command}` | Command that triggered the node. | !command |
| `{args}` | Text after the command. | hello world |
| `{query}` | Search/input text for profile, music, and lookup plugins. | akashsuu |
| `{reason}` | Moderation/action reason. | No reason provided |
| `{error}` | Plugin error text. | No error |
| `{server}` | Server name. | My Server |
| `{guild}` | Server name alias. | My Server |
| `{guildId}` | Server ID. | 222222222222222222 |
| `{guild_id}` | Server ID alias. | 222222222222222222 |
| `{serverId}` | Server ID alias. | 222222222222222222 |
| `{server_id}` | Server ID alias. | 222222222222222222 |
| `{channel}` | Channel name. | general |
| `{channelName}` | Channel name alias. | general |
| `{channel_name}` | Channel name alias. | general |
| `{channelId}` | Channel ID. | 333333333333333333 |
| `{channel_id}` | Channel ID alias. | 333333333333333333 |
| `{channelMention}` | Channel mention. | #general |
| `{channel_mention}` | Channel mention alias. | #general |
| `{channelType}` | Channel type. | Text |
| `{category}` | Channel category. | Community |
| `{topic}` | Channel topic. | General chat |
| `{nsfw}` | Whether channel is NSFW. | No |
| `{slowmode}` | Channel slowmode. | 0s |
| `{position}` | Channel position. | 3 |
| `{permissionsSummary}` | Channel permission summary. | View Channel, Send Messages |
| `{createdAt}` | Created date. | February 21, 2024 |
| `{created_at}` | Created date alias. | February 21, 2024 |
| `{memberCount}` | Server member count. | 1,234 |
| `{member_count}` | Server member count alias. | 1,234 |
| `{count}` | Generic count value. | 1,234 |
| `{date}` | Current date. | 2026-05-14 |
| `{time}` | Current time. | 12:00:00 |
| `{latency}` | Bot latency. | 42 |

## Bot And App Info

| Variable | Details | Example |
| --- | --- | --- |
| `{bot_name}` | Bot name. | Bot |
| `{botName}` | Bot name alias. | Bot |
| `{bot_tag}` | Bot tag. | Bot#0000 |
| `{bot_id}` | Bot ID. | 444444444444444444 |
| `{botId}` | Bot ID alias. | 444444444444444444 |
| `{owner}` | Bot owner name. | Bot Owner |
| `{owner_id}` | Bot owner ID. | 555555555555555555 |
| `{ownerId}` | Bot owner ID alias. | 555555555555555555 |
| `{ownerMention}` | Bot owner mention. | @Bot Owner |
| `{command_count}` | Total command count. | 81 |
| `{ping}` | Bot ping. | 42ms |
| `{uptime}` | Bot uptime. | 12d 4h 18m |
| `{server_count}` | Total server count. | 128 |
| `{serverCount}` | Total server count alias. | 128 |
| `{user_count}` | Total user count. | 42,981 |
| `{userCount}` | Total user count alias. | 42,981 |
| `{botCount}` | Bot count. | 12 |
| `{channel_count}` | Total channel count. | 1,204 |
| `{channelCount}` | Total channel count alias. | 1,204 |
| `{roleCount}` | Role count. | 42 |
| `{textChannels}` | Text channel count. | 24 |
| `{voiceChannels}` | Voice channel count. | 8 |
| `{channels}` | Channel count. | 32 |
| `{roles}` | Role count alias. | 42 |
| `{members}` | Member count alias. | 1,234 |
| `{discordjs_version}` | Discord.js version. | 14.x |
| `{discordVersion}` | Discord.js version alias. | 14.x |
| `{node_version}` | Node.js version. | v20.x |
| `{nodeVersion}` | Node.js version alias. | v20.x |
| `{memory}` | Memory usage. | 148 MB |
| `{memoryUsed}` | Used memory. | 148 MB |
| `{memoryTotal}` | Total memory. | 512 MB |
| `{avatar_url}` | Avatar image URL. | Discord image URL |
| `{avatarUrl}` | Avatar image URL alias. | Discord image URL |
| `{banner_url}` | Banner image URL. | Discord image URL |
| `{bannerUrl}` | Banner image URL alias. | Discord image URL |
| `{invite_url}` | Invite URL. | Discord invite URL |
| `{inviteUrl}` | Invite URL alias. | Discord invite URL |
| `{support_url}` | Support server URL. | Discord support URL |
| `{invite_link}` | Invite markdown link. | Open Invite |
| `{support_link}` | Support markdown link. | Support Server |

## Embed, Image, And UI Text

| Variable | Details | Example |
| --- | --- | --- |
| `{imageUrl}` | Image URL. | Discord image URL |
| `{image_url}` | Image URL alias. | Discord image URL |
| `{iconUrl}` | Icon URL. | Discord image URL |
| `{authorName}` | Embed author name. | Akashsuu |
| `{thumbUrl}` | Thumbnail URL. | Discord image URL |
| `{image}` | Image URL alias. | Discord image URL |
| `{thumb}` | Thumbnail URL alias. | Discord image URL |
| `{icon}` | Icon URL alias. | Discord image URL |
| `{logo}` | Logo URL alias. | Discord image URL |
| `{banner}` | Banner URL alias. | Discord image URL |
| `{footer}` | Footer text. | Requested by Akashsuu |
| `{color}` | Embed color. | #5865F2 |
| `{url}` | Profile or button URL. | https://example.com/profile |
| `{description}` | Description/profile text. | Welcome to my profile. |
| `{title}` | Title text, often music title. | Song Title |
| `{author}` | Author/artist text. | Artist |

## Welcome And Bot Activity

| Variable | Details | Example |
| --- | --- | --- |
| `{account_created}` | User account creation date. | February 21, 2024 |
| `{server_icon}` | Server icon URL. | Discord image URL |
| `{activityName}` | Bot activity name. | ROBLOX |
| `{activityType}` | Bot activity type. | Playing |
| `{producerName}` | Listening producer name. | Producer |
| `{status}` | Bot status. | online |
| `{animatedAvatarUrl}` | Animated avatar URL. | Discord image URL |
| `{animatedBannerUrl}` | Animated banner URL. | Discord image URL |
| `{profileUpdate}` | Bot profile update result text. | Activity updated |

## Music And Calculator

| Variable | Details | Example |
| --- | --- | --- |
| `{duration}` | Song duration. | 3:21 |
| `{posterUrl}` | Song poster/thumbnail URL. | Discord image URL |
| `{poster}` | Song poster alias. | Discord image URL |
| `{artist}` | Song artist alias. | Artist |
| `{expression}` | Calculator expression. | 2-5x0 |
| `{result}` | Calculator result. | 2 |
| `{aliases}` | Command aliases. | calc, math, solve |

## Utility Plugins

| Variable | Details | Example |
| --- | --- | --- |
| `{boostCount}` | Server boost count. | 14 |
| `{boostTier}` | Server boost tier number. | 2 |
| `{boostTierLabel}` | Server boost tier label. | Level 2 |
| `{boostLevel}` | Server boost level. | Level 2 |
| `{boosts}` | Boost count alias. | 14 |
| `{boostBar}` | Text boost progress bar. | ######---- |
| `{since}` | AFK/time duration. | 5 minutes |
| `{days}` | Days count. | 2 |
| `{hours}` | Hours count. | 4 |
| `{minutes}` | Minutes count. | 18 |
| `{years}` | Years count. | 2 |
| `{joinedAt}` | User join date. | May 10, 2026 |
| `{createdTimestamp}` | User creation date. | February 21, 2024 |
| `{topRole}` | User top role. | @Member |
| `{isBot}` | Whether user is a bot. | No |
| `{statusText}` | User status text. | Online |
| `{currentName}` | Current name. | Old name |
| `{newName}` | New name. | New name |
| `{oldName}` | Old name. | Old name |
| `{newPrefix}` | New bot prefix. | ? |
| `{oldPrefix}` | Old bot prefix. | ! |
| `{emoji}` | Emoji text. | :sparkles: |
| `{answer}` | Answer text. | 42 |
| `{question}` | Question text. | What is the answer? |
| `{fact}` | Fact text. | Discord bots can be customized. |
| `{quote}` | Quote text. | Stay curious. |
| `{cat}` | Cat image URL. | Discord image URL |
| `{gif}` | GIF URL. | GIF URL |
| `{gifUrl}` | GIF URL alias. | GIF URL |
| `{anime}` | Anime name. | Naruto |

## Tickets And Moderation

| Variable | Details | Example |
| --- | --- | --- |
| `{role}` | Role name/mention. | @Member |
| `{roleMention}` | Role mention. | @Member |
| `{roleId}` | Role ID. | 666666666666666666 |
| `{deleted}` | Deleted message count. | 25 |
| `{seconds}` | Slowmode/timeout seconds. | 10 |
| `{lockedCount}` | Locked channel count. | 8 |
| `{failedCount}` | Failed action count. | 0 |
| `{unlockedCount}` | Unlocked channel count. | 8 |
| `{bannedCount}` | Banned user count. | 2 |
| `{targets}` | Target list. | @User1, @User2 |
| `{ticketId}` | Ticket ID. | ticket-1024 |
| `{ticket_id}` | Ticket ID alias. | ticket-1024 |
| `{ticketUser}` | Ticket owner. | Akashsuu |
| `{ticket_user}` | Ticket owner alias. | Akashsuu |
| `{claimedBy}` | Staff member who claimed ticket. | Staff |
| `{claimed_by}` | Staff member who claimed ticket alias. | Staff |
| `{ticketNum}` | Ticket number. | 1024 |
| `{openedAt}` | Ticket opened time. | May 14, 2026 12:00 |
| `{closedAt}` | Ticket closed time. | May 14, 2026 12:30 |
| `{requester}` | Ticket requester mention. | @Akashsuu |
| `{closerTag}` | Staff closer tag. | Staff#0001 |
| `{closeCommand}` | Close command. | !close |
| `{confirmationKeyword}` | Confirmation word. | confirm |

## Minecraft Profile

| Variable | Details | Example |
| --- | --- | --- |
| `{edition}` | Minecraft edition. | Java |
| `{mc_name}` | Minecraft username. | akashsuu |
| `{mc_uuid}` | Minecraft UUID. | 0362e2fb-bd0a-4b49-8608-e0fc8af35cde |
| `{skin_link}` | Minecraft skin markdown link. | Open Skin |
| `{skin_url}` | Minecraft skin URL. | Crafatar skin URL |
| `{render_url}` | Minecraft body render URL. | Crafatar render URL |
| `{name_change_count}` | Minecraft username change count. | 2 |
| `{name_history}` | Minecraft name history. | akashsuu - First username |

## Roblox Profile

| Variable | Details | Example |
| --- | --- | --- |
| `{roblox_id}` | Roblox user ID. | 156 |
| `{roblox_name}` | Roblox username. | builderman |
| `{display_name}` | Roblox display name. | builderman |
| `{verified}` | Roblox verified status. | Yes |
| `{banned}` | Roblox banned status. | No |
| `{friends}` | Roblox friend count. | 142 |
| `{following}` | Roblox following count. | 37 |
| `{followers}` | Roblox follower count. | 2,481 |

## Fortnite And Valorant Profile

| Variable | Details | Example |
| --- | --- | --- |
| `{fortnite_name}` | Fortnite username. | Ninja |
| `{account_id}` | Game account ID. | account_123 |
| `{platform}` | Platform name. | PC |
| `{time_window}` | Stats time window. | lifetime |
| `{wins}` | Win count. | 3,412 |
| `{kills}` | Kill count. | 125,884 |
| `{matches}` | Match count. | 28,430 |
| `{kd}` | K/D ratio. | 4.42 |
| `{win_rate}` | Win rate. | 12% |
| `{score}` | Score. | 9,840,221 |
| `{valorant_name}` | Valorant name. | TenZ |
| `{valorant_tag}` | Valorant tag. | 0505 |
| `{puuid}` | Valorant PUUID. | valorant-puuid |
| `{region}` | Valorant region. | AP |
| `{account_level}` | Valorant account level. | 438 |
| `{current_rank}` | Valorant current rank. | Radiant |
| `{rr}` | Rank rating. | 812 |
| `{elo}` | ELO. | 2,147 |
| `{last_change}` | Last rank change. | +21 |
| `{peak_rank}` | Peak rank. | Radiant |
| `{leaderboard_rank}` | Leaderboard rank. | #128 |
| `{card_url}` | Valorant card image URL. | Discord image URL |

## Steam, Counter-Strike, PUBG, And Phasmophobia

| Variable | Details | Example |
| --- | --- | --- |
| `{steam_id}` | Steam ID. | 76561198000000000 |
| `{steamId}` | Steam ID alias. | 76561198000000000 |
| `{steam_name}` | Steam display name. | Akashsuu |
| `{visibility}` | Steam profile visibility. | Public |
| `{persona_state}` | Steam persona state. | Online |
| `{playtime}` | Game playtime. | 284 hours |
| `{deaths}` | Death count. | 83,102 |
| `{mvps}` | MVP count. | 14,921 |
| `{accuracy}` | Accuracy percentage. | 23.6% |
| `{headshots}` | Headshot count. | 91,884 |
| `{country}` | Country code. | IN |
| `{last_online}` | Last online date. | May 14, 2026 |
| `{game_count}` | Steam game count. | 142 |
| `{total_playtime}` | Total playtime. | 3,840 hours |
| `{recent_games}` | Recently played games. | Counter-Strike 2, Phasmophobia, Terraria |
| `{pubg_name}` | PUBG username. | shroud |
| `{shard}` | PUBG shard/platform. | steam |
| `{game_mode}` | PUBG game mode. | squad-fpp |
| `{recent_matches}` | Recent match count. | 14 |
| `{rounds}` | Rounds played. | 1,382 |
| `{top10s}` | Top 10 count. | 602 |
| `{damage}` | Damage amount. | 1,024,391 |
| `{longest_kill}` | Longest kill distance. | 612.4m |
| `{phasmo_level}` | Phasmophobia level. | Level 84 |
| `{prestige}` | Phasmophobia prestige. | Prestige 2 |
| `{favorite_map}` | Favorite map. | Sunny Meadows |
| `{favorite_ghost}` | Favorite ghost. | Demon |
| `{difficulty}` | Difficulty. | Professional |
| `{perfect_games}` | Perfect game count. | 18 |

## Genshin And Epic Games

| Variable | Details | Example |
| --- | --- | --- |
| `{uid}` | Genshin UID. | 618285856 |
| `{input_name}` | Input player name. | Lumine |
| `{nickname}` | Genshin nickname. | Lumine |
| `{level}` | Player level. | 60 |
| `{world_level}` | Genshin world level. | 8 |
| `{signature}` | Genshin signature. | Ad astra abyssosque. |
| `{achievements}` | Achievement count. | 1,102 |
| `{abyss}` | Spiral Abyss result. | 12-3 |
| `{abyssFloor}` | Abyss floor. | 12 |
| `{abyssChamber}` | Abyss chamber. | 3 |
| `{showcase_count}` | Character showcase count. | 8 |
| `{namecard_id}` | Namecard ID. | 210001 |
| `{profile_icon_id}` | Profile icon ID. | 10000007 |
| `{ttl}` | API cache TTL. | 300 |
| `{epic_name}` | Epic Games name. | Akashsuu |
| `{linked_platforms}` | Linked platforms. | PC, PlayStation |
| `{privacy}` | Profile privacy. | Public |
| `{creator_code}` | Creator code. | AKASH |
| `{games}` | Game list. | Fortnite, Rocket League |
| `{gamertag}` | Game player tag. | Akashsuu |

## Shared Profile Links

| Variable | Details | Example |
| --- | --- | --- |
| `{profile_url}` | Profile URL. | https://example.com/profile |
| `{profile_link}` | Profile markdown link. | Open Profile |
