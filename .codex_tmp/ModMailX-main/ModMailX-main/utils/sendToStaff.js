const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, SectionBuilder, ThumbnailBuilder } = require('discord.js');
const emoji = require('../emoji');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = async (channel, user, content, staff, client) => {
    const container = new ContainerBuilder();
    
    const section = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${emoji.reply} Staff Reply\n${content}`)
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(staff.displayAvatarURL())
        );
        
    container.addSectionComponents(section)
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# **Sent by:** ${staff.tag}\n-# **Replied to:** ${user.tag}`)
        );

    await channel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
};
