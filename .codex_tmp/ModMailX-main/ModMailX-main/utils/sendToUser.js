const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, SectionBuilder, ThumbnailBuilder } = require('discord.js');
const emoji = require('../emoji');
const config = require('../config');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = async (user, content, staff, client, mode = 'normal') => {
    const isAnon = mode === 'anonymous';
    
    const container = new ContainerBuilder();
    
    if (isAnon) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${emoji.reply} Staff reply\n${content}`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# **Sent by:** Staff Member`)
        );
    } else {
        const section = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${emoji.reply} Staff reply\n${content}`)
            )
            .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(staff.displayAvatarURL())
            );
            
        container.addSectionComponents(section)
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# **Sent by:** ${staff.tag}`)
            );
    }

    try {
        await user.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
        return true;
    } catch (error) {
        if (error.code !== 50007) console.error(error);
        return false;
    }
};
