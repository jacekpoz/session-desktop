/* global
  Backbone,
  Whisper,
*/

/* eslint-disable more/no-then */

// eslint-disable-next-line func-names
(function() {
  'use strict';

  window.Whisper = window.Whisper || {};
  Whisper.ReadSyncs = new (Backbone.Collection.extend({
    forMessage(message) {
      const receipt = this.findWhere({
        sender: message.get('source'),
        timestamp: message.get('sent_at'),
      });
      if (receipt) {
        window.log.info('Found early read sync for message');
        this.remove(receipt);
        return receipt;
      }

      return null;
    },
    async onReceipt(receipt) {
      try {
        const messages = await window.Signal.Data.getMessagesBySentAt(receipt.get('timestamp'));

        const found = messages.find(
          item => item.isIncoming() && item.get('source') === receipt.get('sender')
        );
        const notificationForMessage = found
          ? Whisper.Notifications.findWhere({ messageId: found.id })
          : null;
        const removedNotification = Whisper.Notifications.remove(notificationForMessage);
        const receiptSender = receipt.get('sender');
        const receiptTimestamp = receipt.get('timestamp');
        const wasMessageFound = Boolean(found);
        const wasNotificationFound = Boolean(notificationForMessage);
        const wasNotificationRemoved = Boolean(removedNotification);
        window.log.info('Receive read sync:', {
          receiptSender,
          receiptTimestamp,
          wasMessageFound,
          wasNotificationFound,
          wasNotificationRemoved,
        });

        if (!found) {
          return;
        }

        const readAt = receipt.get('read_at');

        // If message is unread, we mark it read. Otherwise, we update the expiration
        //   timer to the time specified by the read sync if it's earlier than
        //   the previous read time.
        if (found.isUnread() && window.isFocused()) {
          await found.markRead(readAt);

          // onReadMessage may result in messages older than this one being
          //   marked read. We want those messages to have the same expire timer
          //   start time as this one, so we pass the readAt value through.
          const conversation = found.getConversation();
          if (conversation) {
            conversation.onReadMessage(found, readAt);
          }
        } else {
          const now = Date.now();
          const existingTimestamp = found.get('expirationStartTimestamp');
          const expirationStartTimestamp = Math.min(
            now,
            Math.min(existingTimestamp || now, readAt || now)
          );
          found.set({ expirationStartTimestamp });

          const force = true;
          await found.setToExpire(force);
        }

        this.remove(receipt);
      } catch (error) {
        window.log.error('ReadSyncs.onReceipt error:', error && error.stack ? error.stack : error);
      }
    },
  }))();
})();
