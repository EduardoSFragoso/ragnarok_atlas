"""Testes de segurança para os workflows do GitHub Actions."""

import re
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent


class TestWorkflowDivinePride(unittest.TestCase):
    def test_delay_do_dispatch_nao_e_interpolado_no_comando_shell(self):
        workflow = (RAIZ / ".github/workflows/puxar-efeitos-divine-pride.yml").read_text(encoding="utf-8")
        passo = workflow.split("- name: Rodar o script", maxsplit=1)[1].split("- name:", maxsplit=1)[0]
        comando = passo.split("run:", maxsplit=1)[1]

        self.assertRegex(passo, re.compile(r"^\s+DELAY:\s*\$\{\{\s*inputs\.delay", re.MULTILINE))
        self.assertNotIn("${{ inputs.delay", comando)
        self.assertIn('--delay "$DELAY"', comando)

    def test_todas_as_actions_estao_fixadas_por_sha(self):
        workflows = (RAIZ / ".github/workflows").glob("*.yml")
        padrao_uses = re.compile(r"^\s*-\s+uses:\s*(\S+)", re.MULTILINE)
        usos = [uso for workflow in workflows for uso in padrao_uses.findall(workflow.read_text(encoding="utf-8"))]

        self.assertTrue(usos, "nenhuma Action encontrada nos workflows")
        for uso in usos:
            with self.subTest(action=uso.split("@", maxsplit=1)[0]):
                self.assertRegex(uso, r"^[^@]+@[0-9a-f]{40}(?:\s+#.+)?$")


if __name__ == "__main__":
    unittest.main()
