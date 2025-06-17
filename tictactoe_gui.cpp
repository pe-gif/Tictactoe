#include <windows.h>
#include <string>
#include <ctime>
#include <cstdlib>

#define BUTTON_ID_BASE 100

char board[3][3] = { {' ', ' ', ' '}, {' ', ' ', ' '}, {' ', ' ', ' '} };
bool xTurn = true;
HWND buttons[3][3];

void UpdateButton(int row, int col) {
    SetWindowTextA(buttons[row][col], board[row][col] == ' ' ? "" : std::string(1, board[row][col]).c_str());
}

bool CheckWin(char player) {
    for (int i = 0; i < 3; ++i) {
        if ((board[i][0] == player && board[i][1] == player && board[i][2] == player) ||
            (board[0][i] == player && board[1][i] == player && board[2][i] == player))
            return true;
    }
    if ((board[0][0] == player && board[1][1] == player && board[2][2] == player) ||
        (board[0][2] == player && board[1][1] == player && board[2][0] == player))
        return true;
    return false;
}

bool BoardFull() {
    for (int i = 0; i < 3; ++i)
        for (int j = 0; j < 3; ++j)
            if (board[i][j] == ' ')
                return false;
    return true;
}

void ResetBoard(HWND hwnd) {
    for (int i = 0; i < 3; ++i)
        for (int j = 0; j < 3; ++j) {
            board[i][j] = ' ';
            UpdateButton(i, j);
        }
    xTurn = true;
}

enum GameMode { HUMAN_VS_HUMAN, HUMAN_VS_COMPUTER };
GameMode gameMode = HUMAN_VS_HUMAN;

void ComputerMove(HWND hwnd) {
    // Simple AI: pick a random empty cell
    int emptyCells[9][2];
    int count = 0;
    for (int i = 0; i < 3; ++i)
        for (int j = 0; j < 3; ++j)
            if (board[i][j] == ' ') {
                emptyCells[count][0] = i;
                emptyCells[count][1] = j;
                ++count;
            }
    if (count > 0) {
        int choice = rand() % count;
        int row = emptyCells[choice][0];
        int col = emptyCells[choice][1];
        board[row][col] = 'O';
        UpdateButton(row, col);
        if (CheckWin('O')) {
            MessageBoxA(hwnd, "O wins!", "Game Over", MB_OK);
            ResetBoard(hwnd);
        } else if (BoardFull()) {
            MessageBoxA(hwnd, "It's a draw!", "Game Over", MB_OK);
            ResetBoard(hwnd);
        } else {
            xTurn = true;
        }
    }
}

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
    case WM_CREATE: {
        // Add mode selection buttons
        CreateWindow("BUTTON", "2 Players", WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_AUTORADIOBUTTON | WS_GROUP,
            50, 10, 90, 30, hwnd, (HMENU)200, ((LPCREATESTRUCT)lParam)->hInstance, NULL);
        CreateWindow("BUTTON", "Vs Computer", WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_AUTORADIOBUTTON,
            150, 10, 100, 30, hwnd, (HMENU)201, ((LPCREATESTRUCT)lParam)->hInstance, NULL);

        SendMessage(GetDlgItem(hwnd, 200), BM_SETCHECK, BST_CHECKED, 0); // Default: 2 Players

        for (int i = 0; i < 3; ++i) {
            for (int j = 0; j < 3; ++j) {
                buttons[i][j] = CreateWindow(
                    "BUTTON", "", WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_PUSHBUTTON,
                    50 + j * 60, 50 + i * 60, 50, 50,
                    hwnd, reinterpret_cast<HMENU>(static_cast<uintptr_t>(BUTTON_ID_BASE + i * 3 + j)), ((LPCREATESTRUCT)lParam)->hInstance, NULL
                );
            }
        }
        srand((unsigned int)time(0));
        break;
    }
    case WM_COMMAND: {
        int id = LOWORD(wParam);
        if (id == 200) {
            gameMode = HUMAN_VS_HUMAN;
            ResetBoard(hwnd);
        } else if (id == 201) {
            gameMode = HUMAN_VS_COMPUTER;
            ResetBoard(hwnd);
        } else if (id >= BUTTON_ID_BASE && id < BUTTON_ID_BASE + 9) {
            int idx = id - BUTTON_ID_BASE;
            int row = idx / 3, col = idx % 3;
            if (board[row][col] == ' ') {
                if (xTurn) {
                    board[row][col] = 'X';
                    UpdateButton(row, col);
                    if (CheckWin('X')) {
                        MessageBoxA(hwnd, "X wins!", "Game Over", MB_OK);
                        ResetBoard(hwnd);
                        return 0;
                    } else if (BoardFull()) {
                        MessageBoxA(hwnd, "It's a draw!", "Game Over", MB_OK);
                        ResetBoard(hwnd);
                        return 0;
                    }
                    xTurn = false;
                    if (gameMode == HUMAN_VS_COMPUTER) {
                        ComputerMove(hwnd);
                    }
                } else if (gameMode == HUMAN_VS_HUMAN) {
                    board[row][col] = 'O';
                    UpdateButton(row, col);
                    if (CheckWin('O')) {
                        MessageBoxA(hwnd, "O wins!", "Game Over", MB_OK);
                        ResetBoard(hwnd);
                    } else if (BoardFull()) {
                        MessageBoxA(hwnd, "It's a draw!", "Game Over", MB_OK);
                        ResetBoard(hwnd);
                    } else {
                        xTurn = true;
                    }
                }
            }
        }
        break;
    }
    case WM_DESTROY:
        PostQuitMessage(0);
        break;
    default:
        return DefWindowProc(hwnd, msg, wParam, lParam);
    }
    return 0;
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE, LPSTR, int nCmdShow) {
    WNDCLASS wc = { 0 };
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = "TicTacToeClass";
    RegisterClass(&wc);

    HWND hwnd = CreateWindow("TicTacToeClass", "Tic Tac Toe",
        WS_OVERLAPPEDWINDOW ^ WS_THICKFRAME ^ WS_MAXIMIZEBOX,
        CW_USEDEFAULT, CW_USEDEFAULT, 260, 270,
        NULL, NULL, hInstance, NULL);

    ShowWindow(hwnd, nCmdShow);
    UpdateWindow(hwnd);

    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    return 0;
}