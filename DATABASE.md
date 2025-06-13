# Drizzle ORM Integration

This Discord bot now includes Drizzle ORM for database management, providing persistent data storage for user activities, command usage, and server settings.

## Database Schema

The following tables are automatically created:

### Users Table
- Stores Discord user information
- Tracks user activity and profile data
- Fields: discord_id, username, discriminator, avatar, joined_at, last_active

### Guilds Table  
- Stores Discord server information
- Tracks server membership and settings
- Fields: discord_id, name, member_count, joined_at, prefix

### Command Usage Table
- Logs all command executions
- Tracks success/failure rates
- Fields: user_id, guild_id, command_name, executed_at, success

### User Settings Table
- Stores individual user preferences
- Customizable notification and language settings
- Fields: user_id, language, timezone, notifications_enabled

### Guild Settings Table
- Stores per-server configuration
- Custom prefixes, channel settings, moderation options
- Fields: guild_id, prefix, welcome_channel_id, log_channel_id, mute_role_id, auto_mod_enabled

## Available Scripts

```bash
# Generate database migrations
npm run db:generate

# Apply migrations to database  
npm run db:migrate

# Push schema changes directly (development)
npm run db:push

# Open Drizzle Studio (database browser)
npm run db:studio
```

## Database Features

### Automatic User Tracking
- Users are automatically added to the database when they send messages
- Activity timestamps are updated on each interaction
- User profile information is synced from Discord

### Command Usage Analytics
- All command executions are logged with success/failure status
- Use the `!db stats` command to view usage statistics
- Useful for monitoring bot performance and popular features

### Server Management
- Servers are automatically registered when the bot joins
- Member counts are tracked and updated
- Custom settings can be configured per server

### User Information Command
- Use `!db user-info [@user]` to view database information for any user
- Shows Discord ID, database ID, and last activity timestamp

## Database Service

The `DatabaseService` class provides methods for:
- Creating and updating users/guilds
- Logging command usage
- Managing user and guild settings
- Retrieving analytics and statistics

## Environment Configuration

Make sure to set up your `.env` file:
```env
DB_FILE_NAME=file:local.db
```

For production deployments, you can use remote SQLite databases or migrate to PostgreSQL/MySQL by updating the Drizzle configuration.

## Integration Points

- **Message Listener**: Automatically logs user activity on message creation
- **Command Success Listener**: Tracks successful command executions
- **Ready Listener**: Initializes database connection on bot startup
- **Database Command**: Provides admin interface for viewing database stats

The integration is designed to be non-intrusive - database failures won't break bot functionality, they'll just be logged as errors.
