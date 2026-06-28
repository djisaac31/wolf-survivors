# Wolf Den Survivors

A 3D isometric browser multiplayer survival shooter with a grounded survival-game look, shareable room codes, and invite links. Players log in with a sheep name, create or join worlds from the lobby, see name tags over every player, chop trees for wood, mine stone and iron, craft, build and repair defenses, plant crops, manage hunger, click the trader to trade, buy from 27 guns including the M4A1 and AK-47, fight wolves, defeat the wolf den, and keep playing after the ending. Worlds can enable PvP and lifesteal hearts.

## Controls

- `WASD`: move in isometric view
- Mouse: aim
- Left click: shoot, use tool, or place selected build
- Click trader: open trade menu
- Mouse wheel: scroll the hotbar
- `B`: toggle build mode
- `1`: wall while in build mode
- `2`: wooden spikes while in build mode
- `3`: gate while in build mode
- `4`: watch tower while in build mode
- `5`: shooting platform while in build mode
- `6`: wolf trap while in build mode
- `7`: campfire while in build mode
- `8`: upgrade bench while in build mode
- `E`: open/close crafting menu
- `U`: switch upgrade target between stone and iron
- `H`: heal near the survivor

Share the room code or the same Render address with `?room=CODE`. Friends enter a sheep name in the lobby and join the world.

## Run locally

```bash
npm start
```

Then open `http://127.0.0.1:4190`.

## Deploy to Render

1. Push this folder to a GitHub repository.
2. In Render, create a new Web Service from that repo.
3. Use:
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check path: `/healthz`

Render will provide the `PORT` environment variable automatically.
