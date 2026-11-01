<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- WhatsApp simulator calls authenticated server functions with the user's scoped client and fixed identity; never use admin or accept another account login, so workspace permissions remain authoritative.
- Share command handling between WhatsApp and the simulator; simulator conversations remain ephemeral and never send messages to Meta.
